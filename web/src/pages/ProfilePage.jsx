import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';

import { api } from '../api/client';
import { forgetUserDoll, getDollParts, getUserDoll } from '../api/dolls';
import AdminPostActions from '../components/AdminPostActions';
import AdminUserPanel from '../components/AdminUserPanel';
import { DEFAULT_AVATAR } from '../components/Avatar';
import ConfirmButton from '../components/ConfirmButton';
import { DoodleCircle } from '../components/Doodle';
import DollFigure from '../components/DollFigure';
import DressUp from '../components/DressUp';
import FeedFilters from '../components/FeedFilters';
import Pagination from '../components/Pagination';
import Pixel from '../components/Pixel';
import PostCard from '../components/PostCard';
import usePolling from '../hooks/usePolling';
import { selectCurrentUser, userUpdated } from '../store/authSlice';
import { describeDoll, layersOf, randomConfig } from '../utils/doll';
import { formatDate, realName } from '../utils/format';
import './ProfilePage.css';

const PAGE_SIZE = 10;
const NO_FILTERS = {
  sort: 'date', order: '', dateFrom: '', dateTo: '', status: '',
};
const BIO_MAX = 300;

// The doll card on the left: just the doll, the dress-up controls open on "Re-dress".
function DollCard({
  profile, isMe, parts, onSaved,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const config = profile.doll_config;

  const startEditing = () => {
    setDraft(config || randomConfig(parts));
    setError('');
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/users/${profile.id}`, { doll_config: draft });
      forgetUserDoll(profile.id);
      onSaved({ doll_config: draft });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="mydoll glass">
      <div className="mydoll__top">
        <h3>
          {isMe ? 'My ' : `${profile.login}'s `}
          <em>doll</em>
        </h3>
        <span className="mono">{profile.use_doll_as_avatar && config ? 'avatar' : 'on the shelf'}</span>
      </div>

      {editing && parts.length > 0 ? (
        <>
          <DressUp parts={parts} config={draft} onChange={setDraft} />
          {error && <p className="fl__error">{error}</p>}
          <div className="mydoll__save">
            <button type="button" className="nbtn nbtn--ink nbtn--sm" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save doll'}
              {' '}
              <span className="spark">✦</span>
            </button>
            <button type="button" className="nbtn nbtn--sm" onClick={() => setDraft(randomConfig(parts))}>Randomize</button>
            <button type="button" className="link-button" onClick={() => setEditing(false)}>cancel</button>
          </div>
        </>
      ) : (
        <>
          <div className="stage stage--view">
            <img className="stage__wings" src="/decor/dot-wings.svg" alt="" />
            {config && parts.length > 0 && <DollFigure layers={layersOf(config, parts)} label={`${profile.login}'s doll`} />}
            {!config && <p className="stage__empty">{isMe ? 'No doll yet. Make one!' : 'No doll yet.'}</p>}
          </div>
          <div className="mydoll__view">
            <span className="mono">{config && parts.length ? describeDoll(config, parts) : ''}</span>
            {isMe && parts.length > 0 && (
              <button type="button" className="nbtn nbtn--ink nbtn--sm" onClick={startEditing}>
                {config ? 'Re-dress' : 'Make a doll'}
                {' '}
                <span className="spark">✦</span>
              </button>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

function ProfilePage() {
  const { id } = useParams();
  const userId = Number(id);
  const me = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const isMe = me?.id === userId;
  const isAdmin = me?.role === 'admin';
  const fileRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [parts, setParts] = useState([]);
  const [tab, setTab] = useState('posts');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [posts, setPosts] = useState({ list: [], total: 0, totalPages: 1, loading: true });
  const [favorites, setFavorites] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: '', bio: '' });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    setProfile(null);
    setLoadError('');
    setTab('posts');
    setPage(1);
    setFilters(NO_FILTERS);
    setEditing(false);
    api.get(`/users/${userId}`)
      .then(setProfile)
      .catch((err) => setLoadError(err.status === 404 ? 'This user does not exist.' : err.message));
    // signing in as an admin adds the ban state to the answer
  }, [userId, me?.id]);

  useEffect(() => {
    getDollParts().then(setParts).catch(() => setParts([]));
  }, []);

  // Posts of this user (GET /api/posts?author=id). Others see only the active ones.
  // quiet: a refresh in the background, without the loading state
  const loadPosts = useCallback((quiet = false) => {
    if (!quiet) setPosts((current) => ({ ...current, loading: true }));
    return api.get('/posts', {
      author: userId,
      page,
      limit: PAGE_SIZE,
      sort: filters.sort,
      order: filters.order,
      date_from: filters.dateFrom,
      // the "to" day is included up to its last second
      date_to: filters.dateTo ? `${filters.dateTo}T23:59:59` : '',
      status: filters.status,
    })
      .then((data) => setPosts({
        list: data.posts, total: data.pagination.total, totalPages: data.pagination.totalPages, loading: false,
      }))
      .catch(() => {
        if (!quiet) {
          setPosts({
            list: [], total: 0, totalPages: 1, loading: false,
          });
        }
      });
  }, [userId, page, filters, me?.id]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Changes made from another account (new posts, an admin editing the profile) show up on their own.
  usePolling(profile && !editing ? () => {
    loadPosts(true);
    api.get(`/users/${userId}`).then(setProfile).catch(() => {});
  } : null, 15000);

  // FeedFilters reports { order } / { from, to } / { status }; any change starts from page 1
  const changeFilters = (patch) => {
    setFilters((current) => ({
      ...current,
      ...('order' in patch && { order: patch.order }),
      ...('from' in patch && { dateFrom: patch.from }),
      ...('to' in patch && { dateTo: patch.to }),
      ...('status' in patch && { status: patch.status }),
      ...('sort' in patch && { sort: patch.sort, order: '' }),
    }));
    setPage(1);
  };
  const filtered = filters.order || filters.dateFrom || filters.dateTo || filters.status || filters.sort !== 'date';

  // Favorites are private: only the owner sees them.
  useEffect(() => {
    if (!isMe) {
      setFavorites(null);
      return;
    }
    api.get('/posts/favorites').then(setFavorites).catch(() => setFavorites([]));
  }, [isMe]);

  if (loadError) {
    return (
      <section className="page glass page--center">
        <h1 className="page__title">Nobody here</h1>
        <p className="page__lead">{loadError}</p>
        <Link to="/" className="nbtn">Back to the feed</Link>
      </section>
    );
  }

  if (!profile) {
    return (
      <div className="prof">
        <div className="skeleton" style={{ height: 460 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  const patchProfile = (changes) => setProfile((current) => ({ ...current, ...changes }));
  const hasDoll = Boolean(profile.doll_config);
  const showDoll = Boolean(profile.use_doll_as_avatar) && hasDoll && parts.length > 0;

  const say = (type, text) => setMessage({ type, text });

  const setAvatarMode = async (useDoll) => {
    if (useDoll === Boolean(profile.use_doll_as_avatar)) return;
    try {
      await api.patch(`/users/${profile.id}`, { use_doll_as_avatar: useDoll });
      forgetUserDoll(profile.id);
      patchProfile({ use_doll_as_avatar: useDoll });
      dispatch(userUpdated({ useDollAsAvatar: useDoll }));
      say('', '');
    } catch (err) {
      say('error', err.message);
    }
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const body = new FormData();
    body.append('avatar', file);
    try {
      const data = await api.patch('/users/avatar', body);
      const picture = data.user?.profile_picture || data.user?.profilePicture;
      patchProfile({ profile_picture: picture });
      dispatch(userUpdated({ profilePicture: picture }));
      // A new photo is probably meant to be seen.
      if (profile.use_doll_as_avatar) await setAvatarMode(false);
      say('success', 'New photo saved.');
    } catch (err) {
      say('error', err.message);
    }
  };

  const startEditing = () => {
    setForm({ fullName: realName(profile), bio: profile.bio || '' });
    setEditing(true);
    say('', '');
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const fullName = form.fullName.trim();
    if (fullName.length > 100) {
      say('error', 'Full name must be at most 100 characters.');
      return;
    }
    try {
      await api.patch(`/users/${profile.id}`, { full_name: fullName, bio: form.bio.trim() });
      patchProfile({ full_name: fullName || profile.login, bio: form.bio.trim() });
      dispatch(userUpdated({ fullName: fullName || profile.login, bio: form.bio.trim() }));
      setEditing(false);
      say('success', 'Profile saved.');
    } catch (err) {
      say('error', err.message);
    }
  };

  const deletePost = async (postId) => {
    try {
      await api.delete(`/posts/${postId}`);
      await loadPosts();
    } catch (err) {
      say('error', err.message);
    }
  };

  const ownActions = (post) => (
    <span className="own">
      <Link to={`/posts/${post.id}/edit`} className="link-button">Edit</Link>
      <ConfirmButton className="link-button link-button--danger" question="Delete?" confirmLabel="Delete" onConfirm={() => deletePost(post.id)}>
        Delete
      </ConfirmButton>
    </span>
  );

  // an admin can hide or delete someone else's post right from the list
  const adminActions = (post) => (isAdmin && post.authorId !== me.id ? (
    <AdminPostActions
      post={post}
      onChange={(changed) => setPosts((current) => ({
        ...current,
        list: current.list.map((item) => (item.id === changed.id ? changed : item)),
      }))}
      onDelete={(postId) => setPosts((current) => ({
        ...current,
        list: current.list.filter((item) => item.id !== postId),
        total: current.total - 1,
      }))}
    />
  ) : null);

  const list = tab === 'posts' ? posts.list : favorites || [];

  return (
    <div className="prof">
      <DollCard profile={profile} isMe={isMe} parts={parts} onSaved={patchProfile} />

      <div className="prof__main">
        <section className="card glass">
          <div className="idrow">
            <span className="photo-ava">
              {showDoll ? (
                <DollFigure layers={layersOf(profile.doll_config, parts)} label={`${profile.login}'s doll`} />
              ) : (
                <img
                  src={profile.profile_picture || DEFAULT_AVATAR}
                  alt={profile.login}
                  onError={(event) => {
                    if (!event.currentTarget.src.endsWith(DEFAULT_AVATAR)) event.currentTarget.src = DEFAULT_AVATAR;
                  }}
                />
              )}
              {isMe && (
                <button type="button" className="photo-ava__change" onClick={() => fileRef.current?.click()}>
                  new photo
                </button>
              )}
            </span>
            {isMe && <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadPhoto} />}

            <div className="idrow__name">
              <div className="mono">profile</div>
              <h1>{realName(profile) || profile.login}</h1>
              <div className="idrow__sub">
                {realName(profile) && (
                  <span className="idrow__login">
                    <i>@</i>
                    {profile.login}
                  </span>
                )}
                <span className="badge">{profile.role}</span>
                <span className="mono">{`joined ${formatDate(profile.created_at).toLowerCase()}`}</span>
              </div>
            </div>
            {isMe && !editing && (
              <span className="idrow__edit">
                <button type="button" className="nbtn nbtn--sm" onClick={startEditing}>Edit profile</button>
                <Link to="/settings" className="link-button">Settings</Link>
              </span>
            )}
          </div>

          {message.text && <p className={`alert alert--${message.type || 'success'}`} style={{ marginTop: 18 }}>{message.text}</p>}

          {editing ? (
            <form className="editbio" onSubmit={saveProfile}>
              <label className="fl">
                <span className="fl__label">Full name</span>
                <span className="inp">
                  <span className="inp__icon"><Pixel name="name" size={14} /></span>
                  <input value={form.fullName} maxLength={100} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
                </span>
              </label>
              <label className="fl">
                <span className="fl__label">
                  Bio
                  <i>{` (${form.bio.length} / ${BIO_MAX})`}</i>
                </span>
                <textarea
                  className="textarea"
                  rows={3}
                  maxLength={BIO_MAX}
                  placeholder="A few words about you and your dolls"
                  value={form.bio}
                  onChange={(event) => setForm({ ...form, bio: event.target.value })}
                />
              </label>
              <div className="editbio__row">
                <button type="submit" className="nbtn nbtn--ink nbtn--sm">
                  Save
                  {' '}
                  <span className="spark">✦</span>
                </button>
                <button type="button" className="link-button" onClick={() => setEditing(false)}>cancel</button>
                <Link to="/password-reset" className="link-button editbio__pw">change password</Link>
              </div>
            </form>
          ) : (
            profile.bio && <p className="bio">{profile.bio}</p>
          )}

          <div className="nums">
            <span>
              <b>{`✦ ${profile.rating}`}</b>
              rating
            </span>
            <span>
              <b>{posts.total}</b>
              {posts.total === 1 ? 'post' : 'posts'}
            </span>
            {isMe && favorites && (
              <span>
                <b>{favorites.length}</b>
                favorites
              </span>
            )}
          </div>

          {isMe && (
            <div className="private">
              {me.email && (
                <span>
                  {'Email '}
                  <b>{me.email}</b>
                  <span className="mono"> · only you see this</span>
                </span>
              )}
              <span className="seg" role="group" aria-label="Avatar">
                <button type="button" className={showDoll ? undefined : 'on'} onClick={() => setAvatarMode(false)}>Photo avatar</button>
                <button
                  type="button"
                  className={showDoll ? 'on' : undefined}
                  disabled={!hasDoll}
                  title={hasDoll ? undefined : 'Make a doll first'}
                  onClick={() => setAvatarMode(true)}
                >
                  Doll avatar
                </button>
              </span>
            </div>
          )}

          {isAdmin && !isMe && profile.role !== 'admin' && (
            <AdminUserPanel profile={profile} onChange={setProfile} />
          )}
        </section>

        <div className="ptabs">
          <button type="button" className={tab === 'posts' ? 'on' : undefined} onClick={() => setTab('posts')}>
            {tab === 'posts' && <DoodleCircle />}
            {isMe ? 'My posts' : 'Posts'}
            <sup>{posts.total}</sup>
          </button>
          {isMe && (
            <button type="button" className={tab === 'favorites' ? 'on' : undefined} onClick={() => setTab('favorites')}>
              {tab === 'favorites' && <DoodleCircle />}
              Favorites
              <sup>{favorites?.length ?? 0}</sup>
            </button>
          )}
          {isMe && (
            <Link to="/posts/new" className="nbtn nbtn--ink nbtn--sm ptabs__new">
              New post
              {' '}
              <span className="spark">✦</span>
            </Link>
          )}
        </div>

        {tab === 'posts' && (
          <div className="pfilters">
            <span className="seg" role="group" aria-label="Sort posts">
              {[['date', 'Newest'], ['likes', 'Most liked']].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={filters.sort === value ? 'on' : undefined}
                  aria-pressed={filters.sort === value}
                  onClick={() => changeFilters({ sort: value })}
                >
                  {label}
                </button>
              ))}
            </span>
            <FeedFilters
              sort={filters.sort}
              order={filters.order}
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              status={filters.status}
              showStatus={isMe || isAdmin}
              isAdmin={isAdmin}
              onChange={changeFilters}
            />
          </div>
        )}

        {tab === 'posts' && posts.loading && posts.list.length === 0 && <div className="skeleton" style={{ height: 160 }} />}

        {list.length === 0 && !(tab === 'posts' && posts.loading) && (
          <div className="empty glass">
            <Pixel name="bunny" color="#c98a9c" size={36} />
            <p className="muted">
              {tab === 'favorites' ? 'Nothing saved yet. Tap “Save” under a post you love.' : (filtered ? 'No posts match these filters.' : 'No posts yet.')}
            </p>
          </div>
        )}

        <div className="plist">
          {list.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              compact
              showAuthor={tab === 'favorites'}
              actions={adminActions(post) || (tab === 'posts' && isMe ? ownActions(post) : null)}
            />
          ))}
        </div>

        {tab === 'posts' && (
          <Pagination page={page} totalPages={posts.totalPages} onChange={setPage} />
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
