import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../api/client';

// Temporary feed: proves the frontend talks to the API.
// The real feed with previews, sorting, filters and pagination comes next.
function HomePage() {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/posts', { sort: 'date', order: 'desc', limit: 5 })
      .then((data) => setPosts(data.posts || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page glass">
      <h1 className="page__title">Hello, world!</h1>
      <p className="page__lead">Latest posts from the API:</p>

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && posts.length === 0 && <p className="muted">No posts yet.</p>}

      <ul className="simple-list">
        {posts.map((post) => (
          <li key={post.id}>
            <Link to={`/posts/${post.id}`}>{post.title}</Link>
            <span className="muted">
              {' by '}
              {post.author?.login}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default HomePage;
