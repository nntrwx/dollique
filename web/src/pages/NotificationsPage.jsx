import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../api/client';
import ConfirmButton from '../components/ConfirmButton';
import { DoodleUnderline } from '../components/Doodle';
import Pixel from '../components/Pixel';
import { formatDate, formatRelativeDate, plural } from '../utils/format';
import './ListPages.css';
import './NotificationsPage.css';

const PAGE_SIZE = 20;
const ACTIVITY = ['post_comment', 'comment_reply', 'post_like', 'comment_like'];
const TABS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'activity', label: 'Activity' },
  { value: 'moderation', label: 'Moderation' },
];
const FILTERS = {
  all: () => true,
  unread: (item) => !item.isRead,
  activity: (item) => ACTIVITY.includes(item.type),
  moderation: (item) => !ACTIVITY.includes(item.type),
};

// A little pixel picture for every kind of notification.
const ICONS = {
  post_comment: 'bubble',
  comment_reply: 'reply',
  post_like: 'heart',
  comment_like: 'heart',
  post_moderated: 'eyeOff',
  post_hidden: 'eyeOff',
  comment_moderated: 'eyeOff',
  comment_hidden: 'eyeOff',
  post_deleted: 'cross',
  comment_deleted: 'cross',
  post_restored: 'tick',
  category_approved: 'tick',
  user_unbanned: 'tick',
  appeal_rejected: 'broken',
  category_rejected: 'broken',
  appeal_submitted: 'mail',
  violation: 'lock',
  user_banned: 'lock',
  profile_reset: 'user',
};
const WARN = ['post_moderated', 'post_hidden', 'comment_moderated', 'comment_hidden', 'post_deleted',
  'comment_deleted', 'appeal_rejected', 'category_rejected', 'violation', 'user_banned', 'profile_reset'];

// "Today", "Yesterday" or "12 Oct 2026": the heading of a day in the list
function dayLabel(value) {
  const day = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (day.toDateString() === today.toDateString()) return 'Today';
  if (day.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return formatDate(value);
}

function groupByDay(items) {
  const groups = [];
  items.forEach((item) => {
    const label = dayLabel(item.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  });
  return groups;
}

// Lets the bell in the header recount the unread ones right away.
const tellBell = () => window.dispatchEvent(new Event('notifications:changed'));

// All notifications in one place: replies and likes, moderator decisions, strikes and bans.
function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const [shown, setShown] = useState(PAGE_SIZE);

  const load = () => api.get('/notifications')
    .then((data) => setItems(data || []))
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => setShown(PAGE_SIZE), [tab]);

  const unread = items.filter((item) => !item.isRead).length;
  const readCount = items.length - unread;
  const filtered = items.filter(FILTERS[tab]);
  const groups = groupByDay(filtered.slice(0, shown));

  const markRead = async (item) => {
    if (item.isRead) return;
    setItems((list) => list.map((one) => (one.id === item.id ? { ...one, isRead: true } : one)));
    await api.patch(`/notifications/${item.id}/read`).catch(load);
    tellBell();
  };

  const markAllRead = async () => {
    setItems((list) => list.map((one) => ({ ...one, isRead: true })));
    await api.patch('/notifications/read-all').catch(load);
    tellBell();
  };

  const remove = async (item) => {
    setItems((list) => list.filter((one) => one.id !== item.id));
    await api.delete(`/notifications/${item.id}`).catch(load);
    tellBell();
  };

  const clearRead = async () => {
    const read = items.filter((item) => item.isRead);
    setItems((list) => list.filter((one) => !one.isRead));
    await Promise.all(read.map((item) => api.delete(`/notifications/${item.id}`))).catch(load);
    tellBell();
  };

  return (
    <div className="listpage inbox">
      <section className="listpage__head">
        <div>
          <h1 className="page__title">
            Little
            {' '}
            <em>letters.</em>
          </h1>
          <p className="page__lead">
            {unread > 0 ? `${plural(unread, 'new one')} waiting. ` : 'You are all caught up. '}
            Replies, likes and every word from the moderators land here.
          </p>
        </div>
        <div className="inbox__actions">
          <button type="button" className="nbtn nbtn--ink nbtn--sm" disabled={!unread} onClick={markAllRead}>
            Mark all as read
          </button>
          {readCount > 0 && (
            <ConfirmButton className="link-button" question={`Delete ${plural(readCount, 'read one')}?`} confirmLabel="Delete" onConfirm={clearRead}>
              Clear read
            </ConfirmButton>
          )}
        </div>
      </section>

      <div className="toolbar">
        <div className="tabs" role="group" aria-label="Show notifications">
          {TABS.map((item) => {
            const count = item.value === 'unread' ? unread : 0;
            return (
              <button
                key={item.value}
                type="button"
                className={tab === item.value ? 'on' : undefined}
                aria-pressed={tab === item.value}
                onClick={() => setTab(item.value)}
              >
                {item.label}
                {count > 0 && <sup className="inbox__count">{count}</sup>}
                {tab === item.value && <DoodleUnderline />}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="alert alert--error">{error}</p>}

      {loading && <div className="inbox__day glass inbox__day--skeleton" />}

      {!loading && filtered.length === 0 && (
        <div className="empty glass inbox__empty">
          <Pixel name="bell" size={28} color="#ecc3cf" />
          <p>{tab === 'unread' ? 'No unread letters. Lovely and quiet.' : 'Nothing here yet.'}</p>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.label} className="inbox__day glass">
          <h2 className="inbox__label mono">{group.label}</h2>
          <ul className="inbox__list">
            {group.items.map((item) => (
              <li key={item.id} className={`note${item.isRead ? '' : ' note--new'}${WARN.includes(item.type) ? ' note--warn' : ''}`}>
                <span className="note__icon" aria-hidden="true">
                  <Pixel name={ICONS[item.type] || 'bell'} size={13} />
                </span>
                <div className="note__body">
                  {item.postId ? (
                    <Link to={`/posts/${item.postId}`} className="note__text" onClick={() => markRead(item)}>{item.message}</Link>
                  ) : (
                    <button type="button" className="note__text" onClick={() => markRead(item)}>{item.message}</button>
                  )}
                  <div className="note__meta mono">
                    <time dateTime={item.createdAt}>{formatRelativeDate(item.createdAt)}</time>
                    {item.type === 'post_moderated' && item.postId && (
                      <Link to={`/posts/${item.postId}`} onClick={() => markRead(item)}>appeal on the post →</Link>
                    )}
                    {!item.isRead && (
                      <button type="button" className="link-button" onClick={() => markRead(item)}>mark as read</button>
                    )}
                  </div>
                </div>
                <button type="button" className="note__del" aria-label="Delete the notification" onClick={() => remove(item)}>
                  <Pixel name="cross" size={8} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {filtered.length > shown && (
        <div className="inbox__more">
          <button type="button" className="nbtn nbtn--sm" onClick={() => setShown((count) => count + PAGE_SIZE)}>Show older</button>
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
