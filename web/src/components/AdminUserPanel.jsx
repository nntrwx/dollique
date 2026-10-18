import { useState } from 'react';

import { api } from '../api/client';
import { formatDateTime } from '../utils/format';
import Pixel from './Pixel';

const BAN_DAYS = [1, 3, 7, 30];

// Admin tools on someone's profile: see whether they are banned, ban for a few days
// with a reason (they get it in a notification) or lift the ban.
function AdminUserPanel({ profile, onChange }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const bannedUntil = profile.banned_until && new Date(profile.banned_until) > new Date()
    ? profile.banned_until
    : null;

  const run = async (action) => {
    setBusy(true);
    setError('');
    try {
      const data = await action();
      onChange({
        ...profile,
        banned_until: data.user?.banned_until ?? null,
        ban_reason: data.user?.ban_reason ?? null,
      });
      setOpen(false);
      setReason('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const ban = (event) => {
    event.preventDefault();
    if (!reason.trim()) {
      setError('Write the reason: the user will see it.');
      return;
    }
    run(() => api.post(`/users/${profile.id}/ban`, { days, reason: reason.trim() }));
  };

  return (
    <div className={`modpanel${bannedUntil ? ' modpanel--banned' : ''}`}>
      <div className="modpanel__row">
        <span className="mono modpanel__label">
          <Pixel name="key" size={11} />
          admin
        </span>
        {bannedUntil ? (
          <span className="modpanel__state">
            {'Banned until '}
            <b>{formatDateTime(bannedUntil)}</b>
            {profile.ban_reason && <span className="muted">{` · ${profile.ban_reason}`}</span>}
          </span>
        ) : (
          <span className="modpanel__state muted">Not banned</span>
        )}
        {bannedUntil ? (
          <button type="button" className="nbtn nbtn--sm" disabled={busy} onClick={() => run(() => api.delete(`/users/${profile.id}/ban`))}>
            Lift the ban
          </button>
        ) : (
          !open && (
            <button type="button" className="nbtn nbtn--danger nbtn--sm" onClick={() => setOpen(true)}>Ban</button>
          )
        )}
      </div>

      {open && !bannedUntil && (
        <form className="modpanel__form" onSubmit={ban} noValidate>
          <span className="seg" role="group" aria-label="Ban length">
            {BAN_DAYS.map((value) => (
              <button key={value} type="button" className={days === value ? 'on' : undefined} onClick={() => setDays(value)}>
                {value === 1 ? '1 day' : `${value} days`}
              </button>
            ))}
          </span>
          <input
            className="modpanel__input"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason, e.g. selling bootlegs"
            aria-label="Ban reason"
            maxLength={500}
            autoFocus
          />
          <div className="modpanel__actions">
            <button type="submit" className="nbtn nbtn--danger nbtn--sm" disabled={busy}>
              {`Ban for ${days === 1 ? '1 day' : `${days} days`}`}
            </button>
            <button type="button" className="link-button" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
      {error && <p className="fl__error">{error}</p>}
    </div>
  );
}

export default AdminUserPanel;
