import { useEffect, useState } from 'react';

import { api } from '../api/client';

function CategoryEditor({ post, onSave, onCancel }) {
  const [categories, setCategories] = useState([]);
  const [chosen, setChosen] = useState(() => post.categories.map((category) => category.id));
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/categories')
      .then((data) => setCategories((data || []).filter((category) => category.status === 'approved')))
      .catch((err) => setError(err.message));
  }, []);

  const toggle = (id) => {
    setError('');
    setChosen((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!chosen.length) {
      setError('Pick at least one category.');
      return;
    }
    onSave(chosen);
  };

  return (
    <form className="catform" onSubmit={submit}>
      <div className="mono">categories of this post</div>
      <div className="catform__list" role="group" aria-label="Categories">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`tag catform__tag${chosen.includes(category.id) ? ' is-on' : ''}`}
            aria-pressed={chosen.includes(category.id)}
            onClick={() => toggle(category.id)}
          >
            {category.title}
          </button>
        ))}
      </div>
      {error && <p className="alert alert--error">{error}</p>}
      <div className="catform__actions">
        <button type="submit" className="nbtn nbtn--sm">Save categories</button>
        <button type="button" className="link-button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default CategoryEditor;
