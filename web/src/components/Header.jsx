import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Link, NavLink, useNavigate, useSearchParams,
} from 'react-router-dom';

import { logout, selectCurrentUser } from '../store/authSlice';
import Avatar from './Avatar';
import Bow from './Bow';
import Icon from './Icon';
import './Header.css';

function Header() {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSearch = (event) => {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;
    setMenuOpen(false);
    navigate(`/search?q=${encodeURIComponent(text)}`);
  };

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/');
  };

  const closeMenu = () => setMenuOpen(false);
  const tabClass = ({ isActive }) => `header__tab${isActive ? ' header__tab--active' : ''}`;

  return (
    <header className="header">
      <div className="header__bar glass">
        <Link to="/" className="header__logo" onClick={closeMenu} aria-label="Dollique, go to the feed">
          <Bow className="bow header__bow" />
          <span>Dollique</span>
        </Link>

        <nav className={`header__nav${menuOpen ? ' header__nav--open' : ''}`}>
          <NavLink to="/" end className={tabClass} onClick={closeMenu}>Feed</NavLink>
          <NavLink to="/categories" className={tabClass} onClick={closeMenu}>Categories</NavLink>
          <NavLink to="/users" className={tabClass} onClick={closeMenu}>Users</NavLink>
          {user && (
            <NavLink to="/posts/new" className={tabClass} onClick={closeMenu}>
              <Icon name="plus" />
              New post
            </NavLink>
          )}
        </nav>

        <form className="header__search" role="search" onSubmit={handleSearch}>
          <Icon name="search" />
          <input
            className="header__search-input"
            type="search"
            placeholder="Search posts…"
            aria-label="Search posts"
            maxLength={100}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>

        <div className="header__user">
          <Link
            to={user ? `/users/${user.id}` : '/login'}
            className="header__profile"
            title={user ? 'My profile' : 'Sign in'}
          >
            <span className="header__who">
              <span className="header__login">{user ? user.login : 'guest'}</span>
              <span className={`badge${user?.role === 'admin' ? ' badge--admin' : ''}`}>
                {user ? user.role : 'visitor'}
              </span>
            </span>
            <Avatar src={user?.profilePicture} alt={user ? user.login : 'Guest'} size={36} />
          </Link>
          {user ? (
            <button className="icon-button" type="button" onClick={handleLogout} title="Log out" aria-label="Log out">
              <Icon name="logout" />
            </button>
          ) : (
            <>
              <Link to="/login" className="button header__guest-link">Sign in</Link>
              <Link to="/register" className="button button--primary">Sign up</Link>
            </>
          )}
          <button
            className="icon-button header__burger"
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name="menu" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
