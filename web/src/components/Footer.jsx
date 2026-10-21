import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { api } from '../api/client';
import { selectCurrentUser } from '../store/authSlice';
import { HeaderLace } from './Lace';
import Pixel from './Pixel';

// Live numbers for the footer: members, posts and categories.
function useSiteStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/users'),
      api.get('/posts', { limit: 1 }),
      api.get('/categories'),
    ])
      .then(([users, posts, categories]) => setStats({
        members: users.length,
        posts: posts.pagination.total,
        categories: categories.length,
      }))
      .catch(() => setStats(null));
  }, []);

  return stats;
}

// The same black ribbon as the header: what Dollique is, where to go, and a few live numbers.
function Footer() {
  const user = useSelector(selectCurrentUser);
  const stats = useSiteStats();

  return (
    <footer className="footer">
      <HeaderLace />
      <div className="footer__inner">
        <div className="footer__about">
          <Link to="/" className="footer__brand" aria-label="Dollique, go to the feed">
            <img src="/logo.svg" alt="Dollique" />
          </Link>
          <p>
            Questions and answers for doll customizers, OOAK artists and figure collectors.
            Ask about repaints, reroots and repairs, and help others with yours.
          </p>
        </div>

        <nav className="footer__col" aria-label="Explore">
          <h2 className="footer__title">Explore</h2>
          <Link to="/">Feed</Link>
          <Link to="/categories">Categories</Link>
          <Link to="/users">Members</Link>
        </nav>

        <nav className="footer__col" aria-label="Your corner">
          <h2 className="footer__title">Your corner</h2>
          {user ? (
            <>
              <Link to="/posts/new">Ask a question</Link>
              <Link to={`/users/${user.id}`}>My profile</Link>
              <Link to="/notifications">Notifications</Link>
              <Link to="/settings">Settings</Link>
            </>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link to="/register">Create an account</Link>
              <Link to="/password-reset">Forgot password</Link>
            </>
          )}
        </nav>

        {stats && (
          <div className="footer__col">
            <h2 className="footer__title">On Dollique</h2>
            <dl className="footer__stats">
              <div>
                <dt>members</dt>
                <dd>{stats.members}</dd>
              </div>
              <div>
                <dt>posts</dt>
                <dd>{stats.posts}</dd>
              </div>
              <div>
                <dt>categories</dt>
                <dd>{stats.categories}</dd>
              </div>
            </dl>
          </div>
        )}

        <div className="footer__bottom">
          <span>{`© ${new Date().getFullYear()} Dollique · USOF`}</span>
          <button type="button" className="footer__top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Back to top
            <Pixel name="up" size={8} />
          </button>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
