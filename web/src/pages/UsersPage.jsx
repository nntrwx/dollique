import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../api/client';
import { getUserDoll } from '../api/dolls';
import Avatar from '../components/Avatar';
import { DoodleUnderline, ShelfLine } from '../components/Doodle';
import DollFigure from '../components/DollFigure';
import Pagination from '../components/Pagination';
import Pixel from '../components/Pixel';
import { formatDate, plural } from '../utils/format';
import './ListPages.css';

const SORTS = [
  { value: 'rating', label: 'Top rated' },
  { value: 'new', label: 'Newest' },
  { value: 'az', label: 'A–Z' },
];

const SORTERS = {
  rating: (a, b) => b.rating - a.rating || b.posts_count - a.posts_count,
  new: (a, b) => new Date(b.created_at) - new Date(a.created_at),
  az: (a, b) => a.login.localeCompare(b.login),
};

const PAGE_SIZE = 12;
const PLACES = ['i', 'ii', 'iii'];

// One member: their doll standing on a little shelf (or the photo when they have no doll).
function MemberCard({ member, place }) {
  const [layers, setLayers] = useState(null);

  useEffect(() => {
    let ignore = false;
    getUserDoll(member.id).then((doll) => {
      if (!ignore) setLayers(doll?.layers?.length ? doll.layers : []);
    });
    return () => {
      ignore = true;
    };
  }, [member.id]);

  return (
    <Link to={`/users/${member.id}`} className="mcard glass">
      {place && <em className="mcard__place">{place}</em>}
      {member.role === 'admin' && <span className="badge mcard__role">admin</span>}
      <div className="mcard__stage">
        {layers === null && <span className="mcard__ghost" />}
        {layers?.length > 0 && <DollFigure layers={layers} label={`${member.login}'s doll`} />}
        {layers?.length === 0 && <Avatar src={member.profile_picture} alt={member.login} size={96} />}
      </div>
      <ShelfLine />
      <h2 className="mcard__login">{member.login}</h2>
      {member.full_name && <div className="mcard__name">{member.full_name}</div>}
      <p className="mcard__bio">{member.bio || 'No bio yet.'}</p>
      <div className="mcard__stats mono">
        <span>
          <b>{`✦ ${member.rating}`}</b>
          rating
        </span>
        <span>
          <b>{member.posts_count}</b>
          {member.posts_count === 1 ? 'post' : 'posts'}
        </span>
        <span>
          <b>{formatDate(member.created_at).replace(/^\d+ /, '')}</b>
          joined
        </span>
      </div>
    </Link>
  );
}

// Everyone on Dollique, each as their doll. Top rated first; the first three get a place.
function UsersPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('rating');
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/users')
      .then((data) => setMembers(data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // a new search or sort starts from the first page
  useEffect(() => setPage(1), [query, sort]);

  const needle = query.trim().toLowerCase();
  const shown = members
    .filter((member) => !needle
      || member.login.toLowerCase().includes(needle)
      || (member.full_name || '').toLowerCase().includes(needle))
    .sort(SORTERS[sort]);
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const pageItems = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // places only make sense in the full rating list
  const withPlaces = sort === 'rating' && !needle && page === 1;

  const changePage = (next) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="listpage">
      <section className="listpage__head">
        <div>
          <div className="mono">№ 03 — members</div>
          <h1 className="page__title">
            Every member
            {' '}
            <em>is a doll.</em>
          </h1>
          <p className="page__lead">
            {members.length > 0 ? `${plural(members.length, 'doll')} on the shelf. ` : ''}
            Rating grows with the likes on their posts and answers.
          </p>
        </div>
        <label className="field listpage__search">
          <Pixel name="search" size={12} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find by login or name"
            aria-label="Find a member"
          />
        </label>
      </section>

      <div className="toolbar">
        <div className="tabs" role="group" aria-label="Sort members">
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
      </div>

      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <div className="mgrid">
          {[0, 1, 2, 3].map((item) => <div key={item} className="mcard glass mcard--skeleton" />)}
        </div>
      ) : (
        <div className="mgrid">
          {pageItems.map((member, index) => (
            <MemberCard key={member.id} member={member} place={withPlaces ? PLACES[index] : undefined} />
          ))}
        </div>
      )}

      {!loading && shown.length === 0 && (
        <div className="empty">
          <Pixel name="bunny" color="#c98a9c" size={36} />
          <h2>Nobody here</h2>
          <p className="muted">{`No member matches “${query.trim()}”.`}</p>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={changePage} />
    </div>
  );
}

export default UsersPage;
