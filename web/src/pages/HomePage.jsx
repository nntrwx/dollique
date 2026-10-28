import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

import { api } from '../api/client';
import AdminPostActions from '../components/AdminPostActions';
import Dropdown from '../components/Dropdown';
import { DoodleCircle, DoodleUnderline, starPath } from '../components/Doodle';
import FeedFilters from '../components/FeedFilters';
import FollowButton from '../components/FollowButton';
import { LaceDivider, RibbonLace } from '../components/Lace';
import Pagination from '../components/Pagination';
import Pixel from '../components/Pixel';
import PostCard from '../components/PostCard';
import TopDolls from '../components/TopDolls';
import useLiveVersion from '../hooks/useLiveVersion';
import usePolling from '../hooks/usePolling';
import { selectCurrentUser } from '../store/authSlice';
import { plural } from '../utils/format';
import './HomePage.css';

const SORTS = [
  { value: 'date', label: 'Newest' },
  { value: 'likes', label: 'Popular' },
];
const PAGE_SIZES = [5, 10, 20];
const DEFAULT_LIMIT = 10;

// Reads the feed settings from the URL, so a filtered page can be reloaded or shared.
// The newest posts come first by default.
function readParams(searchParams) {
  const limit = Number(searchParams.get('limit'));
  return {
    query: searchParams.get('q') || '',
    sort: searchParams.get('sort') === 'likes' ? 'likes' : 'date',
    order: searchParams.get('order') === 'asc' ? 'asc' : 'desc',
    categories: (searchParams.get('categories') || '')
      .split(',')
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0),
    dateFrom: searchParams.get('from') || '',
    dateTo: searchParams.get('to') || '',
    status: ['active', 'inactive'].includes(searchParams.get('status')) ? searchParams.get('status') : '',
    forYou: searchParams.get('feed') === 'for-you',
    page: Math.max(1, Number(searchParams.get('page')) || 1),
    limit: PAGE_SIZES.includes(limit) ? limit : DEFAULT_LIMIT,
  };
}

// The artwork is taped onto the page and its doodles spill onto the paper.
function HeroArt() {
  return (
    <div className="hero__art">
      <svg className="hero__spill" viewBox="0 0 700 600" preserveAspectRatio="none" aria-hidden="true">
        <path className="doodle" d={starPath(30, 70, 14)} stroke="#211c1f" strokeWidth="1.4" />
        <path className="doodle" d={starPath(62, 40, 7)} stroke="#c98a9c" strokeWidth="1.4" />
        <path className="doodle" d="M14 300 c-10 -30 30 -40 34 -14 c3 20 -26 22 -22 4 c2 -10 16 -8 14 2" stroke="#c98a9c" strokeWidth="1.6" />
        <path className="doodle" d="M20 420 c20 10 10 40 -6 30 m6 -30 c-14 -16 10 -30 18 -12" stroke="#211c1f" strokeWidth="1.3" />
        <path className="doodle" d={starPath(670, 540, 12)} stroke="#211c1f" strokeWidth="1.4" />
        <path className="doodle" d="M640 590 c10 -8 22 -4 20 6 c-2 8 -14 8 -12 0" stroke="#c98a9c" strokeWidth="1.4" />
        <path className="doodle" d="M688 120 c-6 -10 4 -18 10 -10 c6 -8 16 0 10 10 l-10 12z" stroke="#c98a9c" strokeWidth="1.5" />
      </svg>
      <div className="hero__print">
        <img src="/decor/hero.jpg" alt="A doll drawn over with lace and little bunnies" />
        <span className="tape tape--1" />
        <span className="tape tape--2" />
      </div>
      <span className="hero__bunny"><Pixel name="bunny" color="#c98a9c" size={40} /></span>
    </div>
  );
}

function HomePage() {
  const user = useSelector(selectCurrentUser);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = readParams(searchParams);
  const isSearch = location.pathname === '/search';
  const toolbarRef = useRef(null);

  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [categories, setCategories] = useState([]);
  const [counts, setCounts] = useState({});
  const [membersCount, setMembersCount] = useState(null);
  // ids of the categories the user follows; their posts make the "For you" feed
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // goes up when categories or posts change, so the category list and its counts reload at once
  const categoriesVersion = useLiveVersion('categories', 'posts');

  // Only approved categories can be picked as a filter. The API has no post counts for
  // categories, so each one is asked for the total of its posts (limit=1 keeps it light).
  useEffect(() => {
    let ignore = false;
    api.get('/categories')
      .then(async (data) => {
        const approved = (data || []).filter((category) => category.status === 'approved');
        if (ignore) return;
        setCategories(approved);
        const totals = await Promise.all([
          api.get('/posts', { limit: 1 }).then((res) => ['all', res.pagination.total]),
          ...approved.map((category) => api.get('/posts', { limit: 1, categories: category.id })
            .then((res) => [category.id, res.pagination.total])),
        ]);
        if (!ignore) setCounts(Object.fromEntries(totals));
      })
      .catch(() => setCategories([]));
    return () => {
      ignore = true;
    };
  }, [user?.id, categoriesVersion]);

  useEffect(() => {
    if (!user) {
      setFollowing([]);
      return;
    }
    api.get('/categories/subscriptions')
      .then((data) => setFollowing(data.categoryIds || []))
      .catch(() => setFollowing([]));
  }, [user?.id]);

  useEffect(() => {
    api.get('/users').then((users) => setMembersCount(users.length)).catch(() => setMembersCount(null));
  }, []);

  const paramsKey = searchParams.toString();
  const feedQuery = () => ({
    page: params.page,
    limit: params.limit,
    sort: params.sort,
    order: params.order,
    search: params.query,
    categories: params.categories.join(','),
    date_from: params.dateFrom,
    // The "to" day is included up to its last second.
    date_to: params.dateTo ? `${params.dateTo}T23:59:59` : '',
    status: params.status,
    feed: params.forYou && user ? 'subscriptions' : '',
  });

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');

    api.get('/posts', feedQuery())
      .then((data) => {
        if (ignore) return;
        setPosts(data.posts || []);
        setPagination(data.pagination || { total: 0, totalPages: 1 });
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
    // paramsKey holds every value read above; user and following change what the API returns.
  }, [paramsKey, user?.id, params.forYou ? following.join(',') : '']);

  // New posts from other people appear without reloading; the list is swapped quietly, with no skeleton.
  usePolling(loading ? null : () => api.get('/posts', feedQuery())
    .then((data) => {
      setPosts(data.posts || []);
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    })
    .catch(() => {}), 15000);

  // Writes changes to the URL. Any change except the page number starts from page 1.
  const updateParams = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    if (!('page' in patch)) next.delete('page');
    setSearchParams(next);
  };

  const changePage = (page) => {
    updateParams({ page: page > 1 ? page : '' });
    toolbarRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const resetFilters = () => {
    updateParams({
      categories: '', from: '', to: '', status: '',
    });
  };

  const toggleCategory = (id) => {
    const next = params.categories.includes(id)
      ? params.categories.filter((item) => item !== id)
      : [...params.categories, id];
    updateParams({ categories: next.join(',') });
  };

  const toggleFollow = async (id) => {
    try {
      const data = following.includes(id)
        ? await api.delete(`/categories/${id}/subscribe`)
        : await api.post(`/categories/${id}/subscribe`);
      setFollowing(data.categoryIds || []);
    } catch (err) {
      setError(err.message);
    }
  };

  // one category picked in the filter: it can be followed right from the feed
  const pickedCategory = params.categories.length === 1
    ? categories.find((category) => category.id === params.categories[0])
    : null;

  const filtersCount = params.categories.length + (params.dateFrom || params.dateTo ? 1 : 0) + (params.status ? 1 : 0);

  return (
    <div className="home">
      {isSearch ? (
        <section className="search-head">
          <div className="mono">search</div>
          <h1 className="page__title">
            {params.query ? (
              <>
                Posts with
                {' '}
                <em>{`“${params.query}”`}</em>
              </>
            ) : 'Search'}
          </h1>
          <p className="page__lead">
            {params.query ? 'In the title or the text. ' : 'Type something in the search bar above. '}
            <Link to="/" className="auth__link">Back to the feed</Link>
          </p>
        </section>
      ) : (
        <section className="hero">
          <div>
            <h1>
              Ask about dolls,
              <br />
              <em>
                OOAK
                <svg viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden="true">
                  <path className="doodle" d="M30 14 C80 -2 170 4 190 30 C206 56 140 76 80 72 C22 68 -4 50 12 30 C22 18 50 10 74 9" stroke="#211c1f" strokeWidth="1.6" />
                </svg>
              </em>
              {' '}
              &amp;
              <br />
              figures.
            </h1>
            <p>Restorations, reroots, legit checks and shelf tours. Ask anything, answer gently, and show off your dolls.</p>
            <div className="hero__actions">
              <Link to={user ? '/posts/new' : '/login'} state={user ? undefined : { from: { pathname: '/posts/new' } }} className="nbtn nbtn--ink">
                Ask a question
                {' '}
                <span className="spark">✦</span>
              </Link>
              <Link to="/categories" className="nbtn">Browse categories</Link>
            </div>
            <div className="hero__facts mono">
              <span>
                <b>{counts.all ?? '·'}</b>
                posts
              </span>
              <span>
                <b>{membersCount ?? '·'}</b>
                dolls
              </span>
              <span>
                <b>{categories.length || '·'}</b>
                categories
              </span>
            </div>
          </div>
          <HeroArt />
        </section>
      )}

      {!isSearch && <LaceDivider />}

      <div className="toolbar" ref={toolbarRef}>
        <div className="tabs" role="group" aria-label="Sort posts">
          {user && (
            <button
              type="button"
              className={params.forYou ? 'on' : undefined}
              aria-pressed={params.forYou}
              title="Posts from the categories you follow"
              onClick={() => updateParams({ feed: 'for-you', sort: '', order: '' })}
            >
              For you
              {params.forYou && <DoodleUnderline />}
            </button>
          )}
          {SORTS.map((sort) => {
            const on = !(params.forYou && user) && params.sort === sort.value;
            return (
              <button
                key={sort.value}
                type="button"
                className={on ? 'on' : undefined}
                aria-pressed={on}
                onClick={() => updateParams({ feed: '', sort: sort.value === 'date' ? '' : sort.value, order: '' })}
              >
                {sort.label}
                {on && <DoodleUnderline />}
              </button>
            );
          })}
        </div>
        <FeedFilters
          sort={params.sort}
          order={params.order}
          dateFrom={params.dateFrom}
          dateTo={params.dateTo}
          status={params.status}
          showStatus={Boolean(user)}
          isAdmin={user?.role === 'admin'}
          onChange={updateParams}
        />
      </div>

      {/* categories: serif words with counts; the chosen ones are circled by hand */}
      <div className="cats" role="group" aria-label="Categories">
        <button
          type="button"
          className={params.categories.length === 0 ? 'on' : undefined}
          aria-pressed={params.categories.length === 0}
          onClick={() => updateParams({ categories: '' })}
        >
          {params.categories.length === 0 && <DoodleCircle />}
          All
          {counts.all !== undefined && <sup>{counts.all}</sup>}
          <RibbonLace />
        </button>
        {categories.map((category) => {
          const on = params.categories.includes(category.id);
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
              {counts[category.id] !== undefined && <sup>{counts[category.id]}</sup>}
              <RibbonLace />
            </button>
          );
        })}
      </div>

      <div className="cols">
        <div>
          <div className="feed-info mono">
            {loading ? '…' : plural(pagination.total, 'post')}
            {filtersCount > 0 && (
              <button type="button" className="link-button" onClick={resetFilters}>× reset filters</button>
            )}
            {user && pickedCategory && (
              <FollowButton
                on={following.includes(pickedCategory.id)}
                title={pickedCategory.title}
                onClick={() => toggleFollow(pickedCategory.id)}
              />
            )}
          </div>

          {error && <p className="alert alert--error">{error}</p>}

          {loading && posts.length === 0 && (
            <div className="feed" aria-hidden="true">
              <div className="skeleton feed__skeleton" />
              <div className="skeleton feed__skeleton" />
              <div className="skeleton feed__skeleton" />
            </div>
          )}

          {!loading && !error && posts.length === 0 && params.forYou && user && (
            <div className="empty glass">
              <Pixel name="star" color="#c98a9c" size={36} />
              <h2>{following.length ? 'Nothing new here…' : 'Your feed is empty'}</h2>
              <p className="muted">
                {following.length
                  ? 'The categories you follow have no posts that match these filters.'
                  : 'Follow a few categories in the Categories list, and their posts will show up here.'}
              </p>
            </div>
          )}

          {!loading && !error && posts.length === 0 && !(params.forYou && user) && (
            <div className="empty glass">
              <Pixel name="bunny" color="#c98a9c" size={44} />
              <h2>Nothing here…</h2>
              <p className="muted">
                {filtersCount > 0 || params.query
                  ? 'No posts match these filters. Try removing some of them.'
                  : 'No posts yet. Be the first to ask!'}
              </p>
              {filtersCount > 0 && (
                <button type="button" className="nbtn nbtn--sm" onClick={resetFilters}>Reset filters</button>
              )}
            </div>
          )}

          <div className={`feed${loading ? ' feed--loading' : ''}`}>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onCategoryClick={(id) => updateParams({ categories: String(id) })}
                actions={user?.role === 'admin' && post.authorId !== user.id ? (
                  <AdminPostActions
                    post={post}
                    onChange={(changed) => setPosts((list) => list.map((item) => (item.id === changed.id ? changed : item)))}
                    onDelete={(id) => setPosts((list) => list.filter((item) => item.id !== id))}
                  />
                ) : null}
              />
            ))}
          </div>

          {posts.length > 0 && (
            <Pagination page={params.page} totalPages={pagination.totalPages} onChange={changePage}>
              <span className="mono">per page</span>
              <Dropdown
                ariaLabel="Posts per page"
                className="dd--right"
                value={params.limit}
                options={PAGE_SIZES.map((size) => ({ value: size, label: String(size) }))}
                onChange={(next) => updateParams({ limit: next === DEFAULT_LIMIT ? '' : next })}
              />
            </Pagination>
          )}
        </div>

        <aside className="side">
          <TopDolls />
          {categories.length > 0 && (
            <div className="panel">
              <h3>Categories</h3>
              {user && <p className="cat-list__hint mono">follow ♡ to see them in “For you”</p>}
              <ul className="cat-list">
                {categories.map((category) => (
                  <li key={category.id}>
                    <button type="button" onClick={() => updateParams({ categories: String(category.id) })}>{category.title}</button>
                    <span>{counts[category.id] ?? ''}</span>
                    {user && (
                      <FollowButton
                        on={following.includes(category.id)}
                        title={category.title}
                        compact
                        onClick={() => toggleFollow(category.id)}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default HomePage;
