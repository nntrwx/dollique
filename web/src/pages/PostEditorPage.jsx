import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { api } from '../api/client';
import { DoodleCircle } from '../components/Doodle';
import Pixel from '../components/Pixel';
import { selectCurrentUser } from '../store/authSlice';
import { shrinkPhoto } from '../utils/shrinkPhoto';
import './PostEditorPage.css';

const MAX_TITLE = 255;
const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function validate({ title, content, categoryIds, photos }) {
  const errors = {};
  if (!title.trim()) errors.title = 'Write a title for your question.';
  else if (title.trim().length > MAX_TITLE) errors.title = `The title must be at most ${MAX_TITLE} characters.`;
  if (!content.trim()) errors.content = 'Tell a bit more in the text.';
  if (categoryIds.length === 0) errors.categories = 'Pick at least one category.';
  if (photos.length > MAX_PHOTOS) errors.photos = `At most ${MAX_PHOTOS} photos.`;
  return errors;
}

// The title field grows with the text instead of scrolling.
function fitHeight(element) {
  if (!element) return;
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
}

// New post (/posts/new) and edit post (/posts/:id/edit): title, text, categories and up to 5 photos.
// Photos already on the post stay as links; new ones are sent as files.
function PostEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const user = useSelector(selectCurrentUser);
  const navigate = useNavigate();
  const titleRef = useRef(null);
  const fileRef = useRef(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryIds, setCategoryIds] = useState([]);
  // { url, file? }: a file means a new photo, without it the photo is already on the post
  const [photos, setPhotos] = useState([]);
  const [photosChanged, setPhotosChanged] = useState(false);
  const [categories, setCategories] = useState([]);
  const [suggestion, setSuggestion] = useState('');
  const [suggestNote, setSuggestNote] = useState('');
  const [errors, setErrors] = useState({});
  const [photoError, setPhotoError] = useState('');
  const [serverError, setServerError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [sending, setSending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [post, setPost] = useState(null);

  useEffect(() => {
    api.get('/categories')
      .then((data) => {
        setCategories((data || []).filter((category) => category.status === 'approved'));
      })
      .catch(() => setCategories([]));
  }, [user?.id]);

  // Editing: load the post into the form.
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    api.get(`/posts/${id}`)
      .then((data) => {
        const loaded = data.post || data;
        setPost(loaded);
        setTitle(loaded.title);
        setContent(loaded.content);
        setCategoryIds(loaded.categories.map((category) => category.id));
        setPhotos(loaded.images.map((url) => ({ url })));
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  useEffect(() => {
    fitHeight(titleRef.current);
  }, [title, loading]);

  // Ask before leaving the page with unsaved text.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // Free the previews of new photos.
  useEffect(() => () => photos.forEach((photo) => photo.file && URL.revokeObjectURL(photo.url)), []);

  const change = (setter, field) => (event) => {
    setter(event.target.value);
    setDirty(true);
    if (errors[field]) setErrors((current) => ({ ...current, [field]: '' }));
  };

  const toggleCategory = (categoryId) => {
    setCategoryIds((current) => (current.includes(categoryId)
      ? current.filter((item) => item !== categoryId)
      : [...current, categoryId]));
    setDirty(true);
    if (errors.categories) setErrors((current) => ({ ...current, categories: '' }));
  };

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const free = MAX_PHOTOS - photos.length;
    const wrongType = files.find((file) => !PHOTO_TYPES.includes(file.type));
    const tooBig = files.find((file) => file.size > MAX_PHOTO_SIZE);
    const good = files.filter((file) => PHOTO_TYPES.includes(file.type) && file.size <= MAX_PHOTO_SIZE);

    let note = '';
    if (wrongType) note = `${wrongType.name}: only JPEG, PNG, WEBP or GIF.`;
    else if (tooBig) note = `${tooBig.name} is bigger than 5 MB.`;
    else if (good.length > free) note = `Only ${MAX_PHOTOS} photos fit, the extra ones were skipped.`;
    setPhotoError(note);

    const added = good.slice(0, Math.max(free, 0)).map((file) => ({ url: URL.createObjectURL(file), file }));
    if (added.length) {
      setPhotos((current) => [...current, ...added]);
      setPhotosChanged(true);
      setDirty(true);
    }
  };

  const removePhoto = (index) => {
    setPhotos((current) => {
      const photo = current[index];
      if (photo.file) URL.revokeObjectURL(photo.url);
      return current.filter((_, i) => i !== index);
    });
    setPhotosChanged(true);
    setDirty(true);
    setPhotoError('');
  };

  const suggestCategory = async (event) => {
    event.preventDefault();
    const name = suggestion.trim();
    if (!name) return;
    setSuggestNote('');
    try {
      const data = await api.post('/categories', { title: name, description: '' });
      const created = data.category || data;
      if (created.status === 'approved') {
        setCategories((current) => [...current, created]);
        toggleCategory(created.id);
        setSuggestNote(`“${created.title}” added.`);
      } else {
        setSuggestNote('Sent to the moderators. You can pick it once it is approved.');
      }
      setSuggestion('');
    } catch (err) {
      setSuggestNote(err.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate({
      title, content, categoryIds, photos,
    });
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setSending(true);
    setServerError('');
    try {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('content', content.trim());
      form.append('categories', categoryIds.join(','));
      const files = await Promise.all(photos.filter((photo) => photo.file).map((photo) => shrinkPhoto(photo.file)));
      files.forEach((file) => form.append('images', file));

      let saved;
      if (isEdit) {
        if (photosChanged) {
          form.append('keep_images', JSON.stringify(photos.filter((photo) => !photo.file).map((photo) => photo.url)));
        }
        saved = await api.patch(`/posts/${id}`, form);
      } else {
        saved = await api.post('/posts', form);
      }
      setDirty(false);
      navigate(`/posts/${(saved.post || saved).id}`);
    } catch (err) {
      setServerError(err.message);
      setSending(false);
    }
  };

  if (loading) {
    return <div className="ed-page"><div className="skeleton ed__skeleton" /></div>;
  }

  if (loadError || (isEdit && post && post.authorId !== user?.id)) {
    return (
      <div className="ed-page">
        <div className="empty glass">
          <Pixel name="lock" color="#c98a9c" size={36} />
          <h2>{loadError ? 'Post not found' : 'Only the author can edit this post'}</h2>
          <p className="muted">{loadError || 'You can still read it and leave a comment.'}</p>
          <Link to={isEdit && !loadError ? `/posts/${id}` : '/'} className="nbtn nbtn--sm">Back</Link>
        </div>
      </div>
    );
  }

  // new photos can only go after the ones already on the post (the API adds them to the end)
  const canAddPhotos = photos.length < MAX_PHOTOS;

  return (
    <div className="ed-page">
      <div className="crumbs mono">
        <button type="button" className="link-button" onClick={() => navigate(-1)}>← Back</button>
        <span>/</span>
        <Link to="/">Feed</Link>
        {isEdit && (
          <>
            <span>/</span>
            <Link to={`/posts/${id}`}>{`post № ${id}`}</Link>
          </>
        )}
        <span>/</span>
        <span>{isEdit ? 'edit' : 'new post'}</span>
      </div>

      <form className="ed" onSubmit={handleSubmit} noValidate>
        <section className="ed__main glass">
          <div className="mono">{isEdit ? 'editing your post' : 'ask the dolls ✦'}</div>

          {post?.moderation && (
            <p className="alert">This post was hidden by a moderator. You can fix it here and then send an appeal from the post page.</p>
          )}

          <label className="ed__label" htmlFor="ed-title">Title</label>
          <textarea
            id="ed-title"
            ref={titleRef}
            className={`ed__title${errors.title ? ' ed__title--invalid' : ''}`}
            rows={1}
            maxLength={MAX_TITLE + 50}
            placeholder="Your question in one line"
            value={title}
            onChange={change(setTitle, 'title')}
            onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
            aria-invalid={Boolean(errors.title)}
          />
          <div className="ed__meta">
            {errors.title ? <span className="fl__error">{errors.title}</span> : <span />}
            <span className={`mono${title.trim().length > MAX_TITLE ? ' error-text' : ''}`}>{`${title.trim().length} / ${MAX_TITLE}`}</span>
          </div>

          <label className="ed__label" htmlFor="ed-text">Text</label>
          <textarea
            id="ed-text"
            className={`textarea ed__text${errors.content ? ' textarea--invalid' : ''}`}
            rows={9}
            placeholder="Which doll, what happened, what you have tried already…"
            value={content}
            onChange={change(setContent, 'content')}
            aria-invalid={Boolean(errors.content)}
          />
          <div className="ed__meta">
            {errors.content ? <span className="fl__error">{errors.content}</span> : <span className="fl__hint">Empty lines split the text into paragraphs.</span>}
          </div>

          <div className="ed__photos-head">
            <span className="ed__label">Photos</span>
            <span className="mono">{`${photos.length} / ${MAX_PHOTOS} · the first one is the cover`}</span>
          </div>
          <div className="ed__photos">
            {photos.map((photo, index) => (
              <figure key={photo.url} className={`ed__photo${index === 0 ? ' ed__photo--cover' : ''}`}>
                <img src={photo.url} alt={`Photo ${index + 1}`} />
                {index === 0 && <span className="ed__cover mono">cover</span>}
                <button type="button" className="ed__remove" aria-label={`Remove photo ${index + 1}`} onClick={() => removePhoto(index)}>
                  <Pixel name="cross" size={8} />
                </button>
              </figure>
            ))}
            {canAddPhotos && (
              <button
                type="button"
                className={`ed__add${dragging ? ' ed__add--drag' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  addFiles(event.dataTransfer.files);
                }}
              >
                <Pixel name="plus" size={14} />
                <span>Add photos</span>
                <small className="mono">or drop them here</small>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept={PHOTO_TYPES.join(',')}
              multiple
              hidden
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = '';
              }}
            />
          </div>
          {(photoError || errors.photos) && <p className="fl__error">{photoError || errors.photos}</p>}
          {!photoError && <p className="fl__hint">JPEG, PNG, WEBP or GIF, up to 5 MB each. Photos are optional.</p>}
        </section>

        <aside className="ed__side">
          <div className="panel">
            <h3>Categories</h3>
            <p className="ed__side-note mono">pick one or more</p>
            <div className="ed__cats" role="group" aria-label="Categories">
              {categories.map((category) => {
                const on = categoryIds.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    className={on ? 'on' : undefined}
                    aria-pressed={on}
                    title={category.description}
                    onClick={() => toggleCategory(category.id)}
                  >
                    {on && <DoodleCircle />}
                    {category.title}
                  </button>
                );
              })}
            </div>
            {errors.categories && <p className="fl__error">{errors.categories}</p>}

            <div className="ed__suggest">
              <input
                className="ed__suggest-input"
                placeholder="Missing one? Suggest it"
                maxLength={100}
                value={suggestion}
                onChange={(event) => setSuggestion(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && suggestCategory(event)}
                aria-label="Suggest a new category"
              />
              <button type="button" className="link-button" onClick={suggestCategory} disabled={!suggestion.trim()}>Suggest</button>
            </div>
            {suggestNote && <p className="fl__hint">{suggestNote}</p>}
          </div>

          <div className="panel ed__publish">
            {serverError && <p className="alert alert--error">{serverError}</p>}
            <button type="submit" className="nbtn nbtn--ink" disabled={sending}>
              {sending ? 'Saving…' : (isEdit ? 'Save changes' : 'Publish')}
              {' '}
              <span className="spark">✦</span>
            </button>
            <Link to={isEdit ? `/posts/${id}` : '/'} className="link-button">Cancel</Link>
            <p className="ed__rules">
              <Pixel name="heart" color="#c98a9c" size={9} />
              Be kind, no bootleg ads and no personal data of other people.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}

export default PostEditorPage;
