import { useState } from 'react';

import { api } from '../api/client';
import ConfirmButton from './ConfirmButton';

// What an admin can do with someone's post right in the feed: hide it from everyone,
// bring it back, or delete it. A reason for hiding can be given on the post page.
function AdminPostActions({ post, onChange, onDelete }) {
  const [busy, setBusy] = useState(false);
  const hidden = post.status === 'inactive';

  const run = async (action) => {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = () => run(async () => {
    const status = hidden ? 'active' : 'inactive';
    await api.patch(`/posts/${post.id}`, { status });
    onChange({ ...post, status });
  });

  const remove = () => run(async () => {
    await api.delete(`/posts/${post.id}`);
    onDelete(post.id);
  });

  return (
    <span className="own own--admin">
      <button type="button" className="link-button" disabled={busy} onClick={toggle}>
        {hidden ? 'Restore' : 'Hide'}
      </button>
      <ConfirmButton className="link-button link-button--danger" question="Delete?" confirmLabel="Delete" onConfirm={remove}>
        Delete
      </ConfirmButton>
    </span>
  );
}

export default AdminPostActions;
