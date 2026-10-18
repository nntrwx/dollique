import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Link, NavLink, useLocation, useNavigate, useSearchParams,
} from 'react-router-dom';

import { logout, selectCurrentUser } from '../store/authSlice';
import Avatar from './Avatar';
import NotificationBell from './NotificationBell';
import { HeaderLace } from './Lace';
import Pixel from './Pixel';
import './Header.css';

// Black ribbon with stickers on it (logo, menu, user) and pink lace hanging below.
// The task asks for: search, the user's role, login and avatar (a link to the profile), log out.
function Header() {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  // After signing in, the user comes back to the page they were reading.
  const onAuthPage = ['/login', '/register'].includes(location.pathname);
  const signInState = onAuthPage ? location.state : { from: location };
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const urlQuery = searchParams.get('q') || '';

  // Keep the search field in sync when the URL changes (back button, "Back to the feed").
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  // "/" jumps to the search field, as the little key hint says.
  useEffect(() => {
    const handleKey = (event) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (event.key === '/' && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

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
  const tabClass = ({ isActive }) => (isActive ? 'on' : undefined);

  return (
    <header className="bar">
      <div className="bar__in">
        <Link to="/" className="logo" onClick={closeMenu} aria-label="Dollique, go to the feed">
          <img src="/logo.svg" alt="Dollique" />
        </Link>

        <nav className={`bar__nav${menuOpen ? ' bar__nav--open' : ''}`}>
          <NavLink to="/" end className={tabClass} onClick={closeMenu}>Feed</NavLink>
          <NavLink to="/categories" className={tabClass} onClick={closeMenu}>Categories</NavLink>
          <NavLink to="/users" end className={tabClass} onClick={closeMenu}>Users</NavLink>
          {/* on phones the gear hides, so Settings lives in the menu */}
          {user && <NavLink to="/settings" className={({ isActive }) => `${isActive ? 'on ' : ''}bar__nav-settings`} onClick={closeMenu}>Settings</NavLink>}
        </nav>

        <div className="bar__right">
          <form className={`search${menuOpen ? ' search--open' : ''}`} role="search" onSubmit={handleSearch}>
            <Pixel name="search" color="#8c7f84" size={12} />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search posts"
              aria-label="Search posts"
              maxLength={100}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd>/</kbd>
          </form>

          {user && <NotificationBell />}
          {user && (
            <NavLink
              to="/settings"
              className={({ isActive }) => `gear${isActive ? ' gear--on' : ''}`}
              title="Settings"
              aria-label="Settings"
              onClick={closeMenu}
            >
              <Pixel name="gear" size={16} />
            </NavLink>
          )}

          <Link
            to={user ? `/users/${user.id}` : '/login'}
            state={user ? undefined : signInState}
            className="me"
            title={user ? 'My profile' : 'Sign in'}
            onClick={closeMenu}
          >
            {user ? (
              <Avatar src={user.profilePicture} alt={user.login} size={34} userId={user.id} />
            ) : (
              <Avatar alt="Guest" size={34} guest />
            )}
            <span className="me__who">
              {user ? user.login : 'guest'}
              <span className="me__role">{user ? user.role : 'visitor'}</span>
            </span>
          </Link>

          {user?.role === 'admin' && (
            // the admin panel is a separate page served by the API (/admin)
            <a href="/admin/" className="sticker sticker--admin" target="_blank" rel="noopener noreferrer" title="Open the admin panel">
              <Pixel name="key" color="#c98a9c" size={9} />
              <span>Admin</span>
            </a>
          )}

          {user ? (
            <button type="button" className="sticker" onClick={handleLogout}>Log out</button>
          ) : (
            <Link to="/login" state={signInState} className="sticker">Sign in</Link>
          )}

          <button
            className={`bar__burger${menuOpen ? ' bar__burger--open' : ''}`}
            type="button"
            aria-label={menuOpen ? 'Close the menu' : 'Menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {/* three lines that fold into a cross */}
            <span className="burger" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </button>
        </div>
      </div>
      <HeaderLace />
    </header>
  );
}

export default Header;
