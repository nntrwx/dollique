import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { api } from '../api/client';
import { getDollParts } from '../api/dolls';
import AuthLayout from '../components/AuthLayout';
import DressUp from '../components/DressUp';
import FormField from '../components/FormField';
import Pixel from '../components/Pixel';
import { layersOf, randomConfig } from '../utils/doll';
import {
  isValid,
  validateEmail,
  validateFullName,
  validateLogin,
  validatePassword,
  validatePasswordConfirmation,
} from '../utils/validators';

const EMPTY_FORM = {
  login: '',
  fullName: '',
  email: '',
  password: '',
  passwordConfirmation: '',
};

function validate(values) {
  return {
    login: validateLogin(values.login.trim()),
    fullName: validateFullName(values.fullName.trim()),
    email: validateEmail(values.email.trim()),
    password: validatePassword(values.password),
    passwordConfirmation: validatePasswordConfirmation(values.password, values.passwordConfirmation),
  };
}

// 0–4 bars for the password meter.
function passwordStrength(password) {
  if (!password) return 0;
  let score = password.length >= 6 ? 1 : 0;
  if (password.length >= 10) score += 1;
  if (/\d/.test(password) && /[a-z]/i.test(password)) score += 1;
  if (/[^a-z0-9]/i.test(password) || (/[a-z]/.test(password) && /[A-Z]/.test(password))) score += 1;
  return score;
}
const STRENGTH = ['too short', 'weak', 'okay', 'good', 'strong'];

function RegisterPage() {
  const location = useLocation();
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [parts, setParts] = useState([]);
  const [doll, setDoll] = useState(null);
  const [dollAsAvatar, setDollAsAvatar] = useState(true);

  // Every new member starts with a randomly dressed doll.
  useEffect(() => {
    getDollParts()
      .then((data) => {
        setParts(data);
        setDoll(randomConfig(data));
      })
      .catch(() => setParts([]));
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  // Check a field as soon as the user leaves it.
  const handleBlur = (event) => {
    const { name } = event.target;
    if (!values[name]) return;
    setErrors((current) => ({ ...current, [name]: validate(values)[name] }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setServerError('');
    if (!isValid(nextErrors)) return;

    setSending(true);
    try {
      await api.post('/auth/register', {
        login: values.login.trim(),
        full_name: values.fullName.trim() || undefined,
        email: values.email.trim(),
        password: values.password,
        password_confirmation: values.passwordConfirmation,
        doll_config: doll?.base ? doll : undefined,
        use_doll_as_avatar: doll?.base ? dollAsAvatar : undefined,
      });
      setSentTo(values.email.trim());
    } catch (error) {
      // 409 means the login or email is taken: show it under the right field.
      if (error.status === 409 && /login/i.test(error.message)) {
        setErrors((current) => ({ ...current, login: 'This login is already taken.' }));
      } else if (error.status === 409 && /email/i.test(error.message)) {
        setErrors((current) => ({ ...current, email: 'An account with this email already exists.' }));
      } else {
        setServerError(error.message);
      }
    } finally {
      setSending(false);
    }
  };

  if (sentTo) {
    return (
      <AuthLayout
        path="sign up"
        heading={(
          <>
            Your doll
            <br />
            <em>is waiting</em>
          </>
        )}
        text="She will be your face here as soon as you confirm your email."
        doll={layersOf(doll, parts)}
        bubble={(
          <>
            see you
            {' '}
            <em>♡</em>
          </>
        )}
        title={(
          <>
            Check your
            {' '}
            <em>inbox</em>
          </>
        )}
      >
        <p className="alert alert--success">
          <Pixel name="mail" color="#5f9a6c" size={11} />
          <span>
            We sent a confirmation link to
            {' '}
            <strong>{sentTo}</strong>
            . Open it to activate your account, then sign in.
          </span>
        </p>
        <Link to="/login" className="nbtn nbtn--ink nbtn--wide">
          Go to sign in
          {' '}
          <span className="spark">✦</span>
        </Link>
      </AuthLayout>
    );
  }

  const strength = passwordStrength(values.password);

  return (
    <section className="join glass">
      <div className="join__dress">
        <div className="step mono">
          <b>1</b>
          dress your doll
        </div>
        <h2>
          Make a
          {' '}
          <em>doll</em>
          {' '}
          first
        </h2>
        {doll && parts.length > 0 ? (
          <>
            <DressUp parts={parts} config={doll} onChange={setDoll} />
            <div className="dtools">
              <button type="button" className="nbtn nbtn--sm" onClick={() => setDoll(randomConfig(parts))}>
                Randomize ✦
              </button>
              <span className="mono">Arrows change hair, outfit and shoes right where they are. You can re-dress your doll any time in your profile.</span>
            </div>
          </>
        ) : (
          <div className="skeleton" style={{ height: 420, marginTop: 14 }} />
        )}
      </div>

      <div className="join__form">
        <div className="step mono">
          <b>2</b>
          your account
        </div>
        <h2>
          Join
          {' '}
          <em>Dollique</em>
        </h2>
        <p className="auth__lead">Ask about faceups, reroots and legit checks, and keep your doll as your face here.</p>

        {serverError && <p className="alert alert--error" role="alert">{serverError}</p>}

        <form className="form" onSubmit={handleSubmit} noValidate>
          <FormField
            label="Login"
            icon="user"
            name="login"
            autoComplete="username"
            maxLength={50}
            value={values.login}
            error={errors.login}
            hint="Latin letters, digits, _ . or -"
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <FormField
            label="Full name"
            optional
            icon="name"
            name="fullName"
            autoComplete="name"
            maxLength={100}
            placeholder="How should we call you?"
            value={values.fullName}
            error={errors.fullName}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <FormField
            label="Email"
            icon="mail"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={100}
            value={values.email}
            error={errors.email}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <div className="pwbox">
            <FormField
              label="Password"
              icon="lock"
              name="password"
              type="password"
              autoComplete="new-password"
              value={values.password}
              error={errors.password}
              onChange={handleChange}
              onBlur={handleBlur}
            >
              {values.password && (
                <div className="meter" aria-label={`Password strength: ${STRENGTH[strength]}`}>
                  {[1, 2, 3, 4].map((bar) => <i key={bar} className={bar <= strength ? 'on' : undefined} />)}
                  <b>{STRENGTH[strength]}</b>
                </div>
              )}
            </FormField>
            <FormField
              label="Repeat password"
              icon="lock"
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              value={values.passwordConfirmation}
              error={errors.passwordConfirmation}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </div>

          <label className="check">
            <input type="checkbox" checked={dollAsAvatar} onChange={(event) => setDollAsAvatar(event.target.checked)} />
            <span className="check__box"><Pixel name="tick" color="#ecc3cf" size={11} /></span>
            Use my doll as avatar
          </label>

          <button className="nbtn nbtn--ink nbtn--wide" type="submit" disabled={sending}>
            {sending ? 'Creating account…' : 'Create account'}
            {' '}
            <span className="spark">✦</span>
          </button>
        </form>

        <div className="auth__note">
          <Pixel name="mail" color="#c98a9c" size={12} />
          We’ll send a letter to confirm your email. Open it, then sign in.
        </div>
        <p className="auth__footer">
          Already have an account?
          {' '}
          <Link to="/login" state={location.state}>Sign in</Link>
        </p>
      </div>
    </section>
  );
}

export default RegisterPage;
