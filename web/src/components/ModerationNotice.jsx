import { useState } from 'react';

import { api } from '../api/client';
import { formatDate, formatDateTime } from '../utils/format';
import ConfirmDialog from './ConfirmDialog';

// The card above a post hidden by a moderator, for its author and for admins.
// It shows the reason and where the appeal stands: the author can send one,
// an admin can approve it (the post comes back) or reject it (the post is deleted).
function ModerationNotice({
  post, isAuthor, isAdmin, onChanged, onDeleted,
}) {
  const { moderation } = post;
  const appeal = moderation.appeal || null;
  const pending = appeal?.status === 'pending';
  const [text, setText] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);

  const run = async (action) => {
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const sendAppeal = (event) => {
    event.preventDefault();
    if (!text.trim()) {
      setError('Write why the post should be returned.');
      return;
    }
    run(async () => {
      await api.post(`/posts/${post.id}/appeal`, { message: text.trim() });
      await onChanged();
    });
  };

  const resolve = (status) => run(async () => {
    await api.patch(`/appeals/${appeal.id}`, { status, admin_response: response.trim() });
    if (status === 'rejected') onDeleted();
    else await onChanged();
  });

  return (
    <section className="notice glass">
      <h2 className="section-title">Hidden by a moderator</h2>
      <p>
        <strong>Reason:</strong>
        {' '}
        {moderation.reason}
      </p>
      {moderation.deleteAfter && !pending && (
        <p className="muted">{`The post will be deleted on ${formatDate(moderation.deleteAfter)} if there is no appeal. If an appeal is rejected, it is deleted at once.`}</p>
      )}

      {pending && (
        <div className="appeal">
          <p className="appeal__label mono">
            {isAuthor ? 'your appeal · waiting for a moderator' : `appeal from ${post.author?.login || 'the author'} · ${formatDateTime(appeal.createdAt)}`}
          </p>
          <blockquote className="appeal__text">{appeal.message}</blockquote>
          {isAuthor && <p className="muted">The deletion timer is paused until a moderator reviews it.</p>}
        </div>
      )}

      {error && <p className="alert alert--error">{error}</p>}

      {isAuthor && !appeal && (
        <form className="notice__form" onSubmit={sendAppeal}>
          <textarea
            className="textarea"
            rows={2}
            maxLength={2000}
            placeholder="Explain why the post should be returned…"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <button type="submit" className="nbtn nbtn--ink nbtn--sm" disabled={busy}>{busy ? 'Sending…' : 'Send appeal'}</button>
        </form>
      )}

      {isAdmin && !isAuthor && !appeal && <p className="muted">The author has not appealed yet.</p>}

      {isAdmin && pending && (
        <div className="notice__form">
          <textarea
            className="textarea"
            rows={2}
            maxLength={2000}
            placeholder="A note for the author (optional)"
            value={response}
            onChange={(event) => setResponse(event.target.value)}
          />
          <div className="appeal__actions">
            <button type="button" className="nbtn nbtn--ink nbtn--sm" disabled={busy} onClick={() => resolve('approved')}>Approve and restore</button>
            <button type="button" className="nbtn nbtn--danger nbtn--sm" disabled={busy} onClick={() => setConfirmReject(true)}>Reject</button>
          </div>
        </div>
      )}

      {confirmReject && (
        <ConfirmDialog
          title="Reject the appeal?"
          confirmLabel={busy ? 'Rejecting…' : 'Reject and delete'}
          cancelLabel="Not now"
          danger
          busy={busy}
          onConfirm={() => resolve('rejected')}
          onCancel={() => setConfirmReject(false)}
        >
          The post will be deleted right away and the author will get a notification.
        </ConfirmDialog>
      )}
    </section>
  );
}

export default ModerationNotice;
