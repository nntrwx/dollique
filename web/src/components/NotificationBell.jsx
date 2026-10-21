import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { api } from '../api/client';
import { formatRelativeDate } from '../utils/format';
import Pixel from './Pixel';
import './NotificationBell.css';

const REFRESH_MS = 60000;

// Bell in the header: comments, replies and likes from other people, and moderation news
// (hidden or deleted posts, strikes, bans, category suggestions). The pink dot counts the unread ones.
function NotificationBell() {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const unread = items.filter((item) => !item.isRead).length;

  const load = () => api.get('/notifications').then((data) => setItems(data || [])).catch(() => {});

  // Checked on every page change, once a minute and when the notifications page changes something.
  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    window.addEventListener('notifications:changed', load);
    return () => {
      clearInterval(timer);
      window.removeEventListener('notifications:changed', load);
    };
  }, [location.pathname]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // A click outside the panel or Escape closes it.
  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (!boxRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const markRead = async (item) => {
    if (item.isRead) return;
    setItems((list) => list.map((one) => (one.id === item.id ? { ...one, isRead: true } : one)));
    await api.patch(`/notifications/${item.id}/read`).catch(load);
  };

  const markAllRead = async () => {
    setItems((list) => list.map((one) => ({ ...one, isRead: true })));
    await api.patch('/notifications/read-all').catch(load);
  };

  const remove = async (item) => {
    setItems((list) => list.filter((one) => one.id !== item.id));
    await api.delete(`/notifications/${item.id}`).catch(load);
  };

  return (
    <div className="bell" ref={boxRef}>
      <button
        type="button"
        className={`bell__btn${unread ? ' bell__btn--new' : ''}`}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Pixel name="bell" size={16} />
        {unread > 0 && <span className="bell__count">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="bell__panel" role="dialog" aria-label="Notifications">
          <div className="bell__head">
            <h3>Notifications</h3>
            {unread > 0 && (
              <button type="button" className="pill" onClick={markAllRead}>
                <Pixel name="tick" size={8} />
                Mark all as read
              </button>
            )}
          </div>

          <div className="bell__scroll">
            {items.length === 0 ? (
              <p className="bell__empty">
                <Pixel name="bell" color="#ecc3cf" size={22} />
                Nothing here yet. Replies, likes and moderator messages will show up here.
              </p>
            ) : (
              <ul className="bell__list">
                {items.map((item) => (
                  <li key={item.id} className={item.isRead ? undefined : 'new'}>
                    <div className="bell__text">
                      {item.postId ? (
                        <Link to={`/posts/${item.postId}`} onClick={() => markRead(item)}>{item.message}</Link>
                      ) : (
                        <button type="button" onClick={() => markRead(item)}>{item.message}</button>
                      )}
                      <time className="mono" dateTime={item.createdAt}>{formatRelativeDate(item.createdAt)}</time>
                    </div>
                    <button type="button" className="bell__del" aria-label="Delete the notification" onClick={() => remove(item)}>
                      <Pixel name="cross" size={8} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link to="/notifications" className="bell__all">
            See all notifications
            <Pixel name="right" size={8} />
          </Link>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
