import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';

import { api } from '../api/client';
import { DoodleCircle, DoodleUnderline } from '../components/Doodle';
import FollowButton from '../components/FollowButton';
import Pixel from '../components/Pixel';
import { selectCurrentUser } from '../store/authSlice';
import { plural } from '../utils/format';
import './ListPages.css';

const SORTS = [
  { value: 'popular', label: 'Popular' },
  { value: 'az', label: 'A–Z' },
  { value: 'new', label: 'Newest' },
];

const SORTERS = {
  popular: (a, b) => b.posts_count - a.posts_count || b.followers_count - a.followers_count,
  az: (a, b) => a.title.localeCompare(b.title),
  new: (a, b) => new Date(b.created_at) - new Date(a.created_at),
};

const TITLE_MAX = 100;

// "Suggest a category": a dashed tile that opens into a small form.
// Only a moderator makes a suggestion public, so the user sees it marked as waiting.
function SuggestTile({ user, onCreated }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (!user) {
    return (
      <Link to="/login" state={{ from: { pathname: '/categories' } }} className="ccard ccard--suggest">
        <Pixel name="plus" size={14} />
        <span className="ccard__title">Suggest a category</span>
        <span className="muted">Sign in to suggest one</span>
      </Link>
    );
  }

  if (!open) {
    return (
      <button type="button" className="ccard ccard--suggest" onClick={() => setOpen(true)}>
        <Pixel name="plus" size={14} />
        <span className="ccard__title">Suggest a category</span>
        <span className="muted">A moderator looks at it first</span>
      </button>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    const name = title.trim();
    if (!name) {
      setError('Give it a name.');
      return;
    }
    if (name.length > TITLE_MAX) {
      setError(`The name can be up to ${TITLE_MAX} characters.`);
      return;
    }
    setSending(true);
    setError('');
    try {
      const data = await api.post('/categories', { title: name, description: description.trim() });
      onCreated(data.category);
      setTitle('');
      setDescription('');
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="ccard ccard--form glass" onSubmit={submit} noValidate>
      <div className="mono">new category</div>
      <input
        className="ccard__input"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Name, e.g. Blythe"
        maxLength={TITLE_MAX}
        aria-label="Category name"
        autoFocus
      />
      <textarea
        className="ccard__textarea"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="What is it about? (optional)"
        rows={3}
        aria-label="Category description"
      />
      {error && <p className="fl__error">{error}</p>}
      <div className="ccard__actions">
        <button type="submit" className="nbtn nbtn--ink nbtn--sm" disabled={sending}>
          {sending ? 'Sending…' : 'Suggest'}
        </button>
        <button type="button" className="link-button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

// Admin: approve a suggested category or reject it with a reason (the author gets notified).
function ReviewActions({ category, onReviewed }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const review = async (status) => {
    if (status === 'rejected' && !reason.trim()) {
      setError('Write the reason for the author.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api.patch(`/categories/${category.id}`, status === 'rejected' ? { status, reason: reason.trim() } : { status });
      onReviewed(data.category);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="ccard__review">
      {rejecting && (
        <input
          className="ccard__input ccard__input--small"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && review('rejected')}
          placeholder="Why not? The author will see it"
          aria-label="Reason for rejecting"
          autoFocus
        />
      )}
      {error && <p className="fl__error">{error}</p>}
      <div className="ccard__actions">
        {rejecting ? (
          <>
            <button type="button" className="nbtn nbtn--danger nbtn--sm" disabled={busy} onClick={() => review('rejected')}>Reject</button>
            <button type="button" className="link-button" onClick={() => setRejecting(false)}>Cancel</button>
          </>
        ) : (
          <>
            <button type="button" className="nbtn nbtn--ink nbtn--sm" disabled={busy} onClick={() => review('approved')}>
              <Pixel name="tick" size={10} />
              Approve
            </button>
            <button type="button" className="link-button link-button--danger" onClick={() => setRejecting(true)}>Reject</button>
          </>
        )}
      </div>
    </div>
  );
}

function CategoryCard({
  category, following, onFollow, showFollow, onReviewed = null,
}) {
  const navigate = useNavigate();
  const approved = category.status === 'approved';
  const open = () => approved && navigate(`/?categories=${category.id}`);

  return (
    <article
      className={`ccard glass${approved ? '' : ` ccard--${category.status}`}`}
      onClick={open}
      role={approved ? 'link' : undefined}
      tabIndex={approved ? 0 : undefined}
      onKeyDown={(event) => event.key === 'Enter' && open()}
    >
      <h2 className="ccard__title">
        <span>
          {category.title}
          {following && <DoodleCircle />}
        </span>
        {approved && <sup>{category.posts_count}</sup>}
      </h2>
      <p className="ccard__text">{category.description || 'No description yet.'}</p>

      {category.status === 'pending' && !onReviewed && <span className="badge badge--hidden">waiting for a moderator</span>}
      {category.status === 'pending' && onReviewed && (
        <>
          <span className="mono">{`suggested by ${category.creator_login || 'deleted user'}`}</span>
          <ReviewActions category={category} onReviewed={onReviewed} />
        </>
      )}
      {category.status === 'rejected' && (
        <p className="ccard__reason">
          <span className="badge badge--hidden">not approved</span>
          {category.rejection_reason && ` ${category.rejection_reason}`}
        </p>
      )}

      {approved && (
        <div className="ccard__foot">
          <span className="mono">
            {`${plural(category.posts_count, 'post')} · ${plural(category.followers_count, 'follower')}`}
          </span>
          {showFollow && (
            // the card itself is a link, the heart must not open it
            <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} role="presentation">
              <FollowButton on={following} title={category.title} short onClick={() => onFollow(category.id, following)} />
            </span>
          )}
        </div>
      )}
    </article>
  );
}

// All categories as glass cards: how many posts, who follows, follow with a heart.
// A card opens the feed filtered by that category.
function CategoriesPage() {
  const user = useSelector(selectCurrentUser);
  const [categories, setCategories] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('popular');
  const [onlyFollowing, setOnlyFollowing] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    api.get('/categories')
      .then((data) => !ignore && setCategories(data || []))
      .catch((err) => !ignore && setError(err.message))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setFollowing([]);
      setOnlyFollowing(false);
      return;
    }
    api.get('/categories/subscriptions')
      .then((data) => setFollowing(data.categoryIds || []))
      .catch(() => setFollowing([]));
  }, [user?.id]);

  const toggleFollow = async (id, on) => {
    // show it at once, the server answers with the real list
    setFollowing((list) => (on ? list.filter((item) => item !== id) : [...list, id]));
    setCategories((list) => list.map((category) => (category.id === id
      ? { ...category, followers_count: category.followers_count + (on ? -1 : 1) }
      : category)));
    try {
      const data = on
        ? await api.delete(`/categories/${id}/subscribe`)
        : await api.post(`/categories/${id}/subscribe`);
      setFollowing(data.categoryIds || []);
    } catch {
      setFollowing((list) => (on ? [...list, id] : list.filter((item) => item !== id)));
    }
  };

  const added = (category) => setCategories((list) => [
    ...list,
    { ...category, posts_count: 0, followers_count: 0 },
  ]);

  const reviewed = (category) => setCategories((list) => list.map((item) => (item.id === category.id
    ? { ...item, ...category }
    : item)));

  const isAdmin = user?.role === 'admin';
  const needle = query.trim().toLowerCase();
  // admins see every suggestion that waits for a decision
  const toReview = isAdmin ? categories.filter((category) => category.status === 'pending') : [];
  const approved = categories.filter((category) => category.status === 'approved');
  // the user's own suggestions that are not public yet
  const mine = categories.filter((category) => category.status !== 'approved' && category.created_by === user?.id);
  const shown = approved
    .filter((category) => !onlyFollowing || following.includes(category.id))
    .filter((category) => !needle
      || category.title.toLowerCase().includes(needle)
      || (category.description || '').toLowerCase().includes(needle))
    .sort(SORTERS[sort]);

  return (
    <div className="listpage">
      <section className="listpage__head">
        <div>
          <h1 className="page__title">
            Find your
            {' '}
            <em>shelf.</em>
          </h1>
          <p className="page__lead">
            {approved.length > 0 ? `${plural(approved.length, 'category', 'categories')}. ` : ''}
            Follow the ones you love and their posts gather in “For you”.
          </p>
        </div>
        <label className="field listpage__search">
          <Pixel name="search" size={12} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a category"
            aria-label="Find a category"
          />
        </label>
      </section>

      <div className="toolbar">
        <div className="tabs" role="group" aria-label="Sort categories">
          {SORTS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={sort === item.value ? 'on' : undefined}
              aria-pressed={sort === item.value}
              onClick={() => setSort(item.value)}
            >
              {item.label}
              {sort === item.value && <DoodleUnderline />}
            </button>
          ))}
        </div>
        {user && (
          <div className="filters">
            <button
              type="button"
              className={`chip${onlyFollowing ? ' on' : ''}`}
              aria-pressed={onlyFollowing}
              onClick={() => setOnlyFollowing((value) => !value)}
            >
              <Pixel name="heart" size={10} />
              {`Following · ${following.length}`}
            </button>
          </div>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      {toReview.length > 0 && (
        <section className="listpage__mine">
          <h2 className="section-title">
            Waiting for review
            <sup className="listpage__count">{toReview.length}</sup>
          </h2>
          <div className="cgrid">
            {toReview.map((category) => (
              <CategoryCard key={category.id} category={category} onReviewed={reviewed} />
            ))}
          </div>
        </section>
      )}

      {mine.length > 0 && (
        <section className="listpage__mine">
          <h2 className="section-title">Your suggestions</h2>
          <div className="cgrid">
            {mine.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="cgrid">
          {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="ccard glass ccard--skeleton" />)}
        </div>
      ) : (
        <div className="cgrid">
          {shown.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              following={following.includes(category.id)}
              onFollow={toggleFollow}
              showFollow={Boolean(user)}
            />
          ))}
          {!needle && !onlyFollowing && <SuggestTile user={user} onCreated={added} />}
        </div>
      )}

      {!loading && shown.length === 0 && (needle || onlyFollowing) && (
        <div className="empty">
          <Pixel name="bunny" color="#c98a9c" size={36} />
          <h2>Nothing here</h2>
          <p className="muted">
            {onlyFollowing && !needle
              ? 'You do not follow any category yet. Tap a heart on a card.'
              : `No category matches “${query.trim()}”.`}
          </p>
        </div>
      )}
    </div>
  );
}

export default CategoriesPage;
