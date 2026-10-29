import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';

import { api } from '../api/client';
import { forgetUserDoll } from '../api/dolls';
import Avatar from '../components/Avatar';
import ConfirmDialog from '../components/ConfirmDialog';
import FormField from '../components/FormField';
import Pixel from '../components/Pixel';
import { logout, selectCurrentUser, userUpdated } from '../store/authSlice';
import { realName } from '../utils/format';
import {
  isValid, validateEmail, validateFullName, validateLogin,
} from '../utils/validators';
import './SettingsPage.css';

const BIO_MAX = 300;
const PHOTO_MAX_MB = 5;

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: 'name' },
  { id: 'account', label: 'Login & email', icon: 'user' },
  { id: 'password', label: 'Password', icon: 'lock' },
  { id: 'delete', label: 'Delete account', icon: 'cross' },
];

// A small message under a form: green when saved, pink when something went wrong.
function Note({ note }) {
  if (!note.text) return null;
  return <p className={`alert alert--${note.type}`} role="status">{note.text}</p>;
}

// Name, bio, the avatar photo and whether the doll is shown instead of it.
function ProfileSection({ user, profile, onSaved }) {
  const dispatch = useDispatch();
  const fileRef = useRef(null);
  const [fullName, setFullName] = useState(realName(user));
  const [bio, setBio] = useState(user.bio || '');
  const [errors, setErrors] = useState({});
  const [note, setNote] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);
  const hasDoll = Boolean(profile?.doll_config);

  const save = async (event) => {
    event.preventDefault();
    const next = { fullName: validateFullName(fullName.trim()) };
    setErrors(next);
    if (!isValid(next)) return;
    setSaving(true);
    try {
      await api.patch(`/users/${user.id}`, { full_name: fullName.trim(), bio: bio.trim() });
      dispatch(userUpdated({ fullName: fullName.trim() || user.login, bio: bio.trim() }));
      setNote({ type: 'success', text: 'Saved.' });
    } catch (err) {
      setNote({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const setAvatarMode = async (useDoll) => {
    try {
      await api.patch(`/users/${user.id}`, { use_doll_as_avatar: useDoll });
      forgetUserDoll(user.id);
      dispatch(userUpdated({ useDollAsAvatar: useDoll }));
      onSaved({ use_doll_as_avatar: useDoll });
    } catch (err) {
      setNote({ type: 'error', text: err.message });
    }
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNote({ type: 'error', text: 'Pick a picture (JPG, PNG, GIF or WebP).' });
      return;
    }
    if (file.size > PHOTO_MAX_MB * 1024 * 1024) {
      setNote({ type: 'error', text: `The photo is too big: up to ${PHOTO_MAX_MB} MB.` });
      return;
    }
    const body = new FormData();
    body.append('avatar', file);
    try {
      const data = await api.patch('/users/avatar', body);
      const picture = data.user?.profile_picture || data.user?.profilePicture;
      dispatch(userUpdated({ profilePicture: picture }));
      // a new photo is meant to be seen
      if (user.useDollAsAvatar) await setAvatarMode(false);
      setNote({ type: 'success', text: 'New photo saved.' });
    } catch (err) {
      setNote({ type: 'error', text: err.message });
    }
  };

  return (
    <section id="profile" className="set glass">
      <h2 className="section-title">Profile</h2>
      <p className="set__lead">How others see you next to your posts and comments.</p>

      <div className="set__ava">
        {/* key: the circle redraws when the doll switch changes */}
        <Avatar key={String(user.useDollAsAvatar)} src={user.profilePicture} alt={user.login} size={84} userId={user.id} />
        <div className="set__ava-side">
          <span className="seg" role="group" aria-label="Avatar">
            <button type="button" className={user.useDollAsAvatar ? undefined : 'on'} onClick={() => setAvatarMode(false)}>Photo</button>
            <button
              type="button"
              className={user.useDollAsAvatar ? 'on' : undefined}
              disabled={!hasDoll}
              title={hasDoll ? undefined : 'Make a doll on your profile first'}
              onClick={() => setAvatarMode(true)}
            >
              My doll
            </button>
          </span>
          <div className="set__ava-links">
            <button type="button" className="link-button" onClick={() => fileRef.current?.click()}>
              <Pixel name="plus" size={8} />
              Upload a photo
            </button>
            <Link to={`/users/${user.id}`} className="link-button">
              <Pixel name="bow" size={10} />
              {hasDoll ? 'Re-dress my doll' : 'Make my doll'}
            </Link>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadPhoto} />
        </div>
      </div>

      <form onSubmit={save} noValidate>
        <FormField
          label="Full name"
          optional
          icon="name"
          value={fullName}
          maxLength={100}
          error={errors.fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
        <div className="fl">
          <label className="fl__label" htmlFor="set-bio">
            Bio
            <i>{` (${bio.length} / ${BIO_MAX})`}</i>
          </label>
          <textarea
            id="set-bio"
            className="textarea"
            rows={3}
            maxLength={BIO_MAX}
            placeholder="A few words about you and your dolls"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
          />
        </div>
        <Note note={note} />
        <button type="submit" className="nbtn nbtn--ink nbtn--sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </section>
  );
}

// Login and email. A new email has to be confirmed from a letter before the next sign in.
function AccountSection({ user, profile, onSaved }) {
  const dispatch = useDispatch();
  const [login, setLogin] = useState(user.login);
  const [email, setEmail] = useState(user.email || '');
  const [errors, setErrors] = useState({});
  const [note, setNote] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);
  const emailChanged = email.trim() !== (user.email || '');
  const unchanged = login.trim() === user.login && !emailChanged;

  const save = async (event) => {
    event.preventDefault();
    const next = { login: validateLogin(login.trim()), email: validateEmail(email.trim()) };
    setErrors(next);
    if (!isValid(next) || unchanged) return;
    setSaving(true);
    try {
      const data = await api.patch(`/users/${user.id}`, { login: login.trim(), email: email.trim() });
      if (emailChanged && user.role !== 'admin') {
        // the new email waits for confirmation, the current one stays in use
        dispatch(userUpdated({ login: login.trim() }));
        onSaved({ pending_email: email.trim() });
        setEmail(user.email || '');
      } else {
        dispatch(userUpdated({ login: login.trim(), email: email.trim() }));
      }
      setNote({ type: 'success', text: data.message });
    } catch (err) {
      setNote({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const confirmed = profile ? Boolean(profile.is_email_confirmed) : true;
  const pendingEmail = profile?.pending_email || '';

  const cancelChange = async () => {
    setSaving(true);
    try {
      const data = await api.patch(`/users/${user.id}`, { email: user.email });
      onSaved({ pending_email: null });
      setNote({ type: 'success', text: data.message });
    } catch (err) {
      setNote({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="account" className="set glass">
      <h2 className="section-title">Login &amp; email</h2>
      <p className="set__lead">The email is never shown to other members.</p>
      <form onSubmit={save} noValidate>
        <FormField
          label="Login"
          icon="user"
          value={login}
          maxLength={50}
          autoComplete="username"
          error={errors.login}
          hint="3–50 characters: latin letters, digits, “_”, “.” or “-”."
          onChange={(event) => setLogin(event.target.value)}
        />
        <FormField
          label="Email"
          icon="mail"
          type="email"
          maxLength={100}
          value={email}
          autoComplete="email"
          error={errors.email}
          ok={!emailChanged && confirmed ? 'confirmed' : ''}
          hint={emailChanged && user.role !== 'admin'
            ? 'We will send a confirmation link to the new email. Until you open it, your current email keeps working.'
            : ''}
          onChange={(event) => setEmail(event.target.value)}
        />
        {pendingEmail && (
          <p className="alert alert--success">
            Waiting for confirmation: <b>{pendingEmail}</b>. Open the link we sent there; until then you sign in with {user.email}.
            {' '}
            <button type="button" className="link-button" onClick={cancelChange} disabled={saving}>Cancel the change</button>
          </p>
        )}
        {!confirmed && !emailChanged && (
          <p className="alert alert--error">Your email is not confirmed yet: open the link we sent to it.</p>
        )}
        <Note note={note} />
        <button type="submit" className="nbtn nbtn--ink nbtn--sm" disabled={saving || unchanged}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </section>
  );
}

// The password is changed through a letter, the same way as "Forgot password".
function PasswordSection({ user }) {
  const [note, setNote] = useState({ type: '', text: '' });
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      await api.post('/auth/password-reset', { email: user.email });
      setNote({ type: 'success', text: `Sent! Open the letter at ${user.email} and choose a new password.` });
    } catch (err) {
      setNote({ type: 'error', text: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="password" className="set glass">
      <h2 className="section-title">Password</h2>
      <p className="set__lead">
        {'We will email a link to '}
        <b>{user.email}</b>
        . It opens a page where you pick a new password, and the link works for one hour.
      </p>
      <Note note={note} />
      <button type="button" className="nbtn nbtn--sm" onClick={send} disabled={sending || !user.email}>
        <Pixel name="mail" size={11} />
        {sending ? 'Sending…' : 'Send me a link'}
      </button>
    </section>
  );
}

// Deleting is forever, so the user types their login to unlock the button.
function DeleteSection({ user }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [asking, setAsking] = useState(false);

  // typing the login unlocks the button, the button asks once more in a window
  const ask = (event) => {
    event.preventDefault();
    if (typed === user.login) setAsking(true);
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api.delete(`/users/${user.id}`);
      await dispatch(logout());
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setDeleting(false);
      setAsking(false);
    }
  };

  return (
    <section id="delete" className="set set--danger glass">
      <h2 className="section-title">Delete account</h2>
      <p className="set__lead">
        Your profile, doll, posts, comments and likes disappear forever. This cannot be undone.
      </p>
      <form onSubmit={ask} noValidate>
        <FormField
          label={`Type “${user.login}” to confirm`}
          icon="cross"
          value={typed}
          autoComplete="off"
          error={error}
          onChange={(event) => setTyped(event.target.value)}
        />
        <button type="submit" className="nbtn nbtn--danger nbtn--sm" disabled={typed !== user.login || deleting}>
          Delete my account
        </button>
      </form>

      {asking && (
        <ConfirmDialog
          title="Delete your account?"
          confirmLabel={deleting ? 'Deleting…' : 'Yes, delete forever'}
          cancelLabel="No, keep it"
          danger
          busy={deleting}
          onConfirm={remove}
          onCancel={() => setAsking(false)}
        >
          <p>{`${user.login}, your doll, posts, comments and likes will disappear for good.`}</p>
          <p>We cannot bring them back.</p>
        </ConfirmDialog>
      )}
    </section>
  );
}

// Account settings: a sticky menu on the left, one glass card per section on the right.
function SettingsPage() {
  const user = useSelector(selectCurrentUser);
  // the full profile has the doll and whether the email is confirmed
  const [profile, setProfile] = useState(null);
  const [active, setActive] = useState('profile');

  useEffect(() => {
    api.get(`/users/${user.id}`).then(setProfile).catch(() => setProfile(null));
  }, [user.id]);

  // highlights the section that is on the screen now
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      if (visible.length) setActive(visible[0].target.id);
    }, { rootMargin: '-120px 0px -55% 0px' });
    SECTIONS.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  // the menu scrolls smoothly to its section instead of jumping there
  const goTo = (event, id) => {
    event.preventDefault();
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
    setActive(id);
  };

  const patchProfile = (patch) => setProfile((current) => (current ? { ...current, ...patch } : current));

  return (
    <div className="settings">
      <section className="settings__head">
        <h1 className="page__title">
          Your little
          {' '}
          <em>corner.</em>
        </h1>
      </section>

      <div className="settings__cols">
        <nav className="setnav glass" aria-label="Settings sections">
          <Link to={`/users/${user.id}`} className="setnav__me">
            <Avatar key={String(user.useDollAsAvatar)} src={user.profilePicture} alt={user.login} size={44} userId={user.id} />
            <span>
              <b>{user.login}</b>
              <span className="mono">view profile →</span>
            </span>
          </Link>
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={`setnav__link${active === section.id ? ' on' : ''}${section.id === 'delete' ? ' setnav__link--danger' : ''}`}
              onClick={(event) => goTo(event, section.id)}
            >
              <Pixel name={section.icon} size={11} />
              {section.label}
            </a>
          ))}
        </nav>

        <div className="settings__main">
          <ProfileSection user={user} profile={profile} onSaved={patchProfile} />
          <AccountSection user={user} profile={profile} onSaved={patchProfile} />
          <PasswordSection user={user} />
          <DeleteSection user={user} />
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
