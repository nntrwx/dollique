import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';

import { getDollParts } from '../api/dolls';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import Pixel from '../components/Pixel';
import { login } from '../store/authSlice';
import { isValid } from '../utils/validators';

// The angel who greets you: parts are found by name in the catalog.
// The silver harness outfit is used once an admin uploads it (any outfit named "...harness..." or "...cyber...").
const ANGEL = [
  { category: 'base', match: /ivory, sleepy/i },
  { category: 'hair', match: /pink waves/i },
  { category: 'shoes', match: /black shoes/i },
  { category: 'outfit', match: /harness|cyber/i, fallback: /lace nightgown/i },
  { category: 'accessory', match: /angel wing/i },
];

function angelLayers(parts) {
  return ANGEL.map(({ category, match, fallback }) => {
    const ofCategory = parts.filter((part) => part.category === category);
    return ofCategory.find((part) => match.test(part.name))
      || (fallback && ofCategory.find((part) => fallback.test(part.name)));
  }).filter(Boolean);
}

function validate(values) {
  return {
    identifier: values.identifier.trim() ? '' : 'Enter your login or email.',
    password: values.password ? '' : 'Enter your password.',
  };
}

function LoginPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const [values, setValues] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [sending, setSending] = useState(false);
  const [angel, setAngel] = useState([]);

  useEffect(() => {
    getDollParts().then((parts) => setAngel(angelLayers(parts))).catch(() => setAngel([]));
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setServerError('');
    if (!isValid(nextErrors)) return;

    // The API accepts either a login or an email.
    const identifier = values.identifier.trim();
    const credentials = identifier.includes('@')
      ? { email: identifier, password: values.password }
      : { login: identifier, password: values.password };

    setSending(true);
    try {
      // On success GuestRoute sees the user and redirects away from this page.
      await dispatch(login(credentials)).unwrap();
    } catch (error) {
      setServerError(error.message);
      setSending(false);
    }
  };

  return (
    <AuthLayout
      path="sign in"
      heading={(
        <>
          Your dolls
          <br />
          <em>missed you</em>
        </>
      )}
      text="Sign in to ask, answer and keep an eye on your favourite threads."
      doll={angel}
      bubble={(
        <>
          hi again
          {' '}
          <em>♡</em>
        </>
      )}
      title={(
        <>
          Sign
          {' '}
          <em>in</em>
        </>
      )}
      subtitle="Use your login or the email you registered with."
    >
      {location.state?.message && <p className="alert alert--success">{location.state.message}</p>}
      {serverError && (
        <p className="alert alert--error" role="alert">
          <Pixel name="mail" color="#b5536c" size={11} />
          {serverError}
        </p>
      )}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <FormField
          label="Login or email"
          icon="user"
          name="identifier"
          autoComplete="username"
          value={values.identifier}
          error={errors.identifier}
          onChange={handleChange}
        />
        <FormField
          label="Password"
          icon="lock"
          name="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          error={errors.password}
          onChange={handleChange}
        />
        <div className="auth__row">
          <Link to="/password-reset">Forgot password?</Link>
        </div>
        <button className="nbtn nbtn--ink nbtn--wide" type="submit" disabled={sending}>
          {sending ? 'Signing in…' : 'Sign in'}
          {' '}
          <span className="spark">✦</span>
        </button>
      </form>

      <p className="auth__footer">
        New here?
        {' '}
        <Link to="/register" state={location.state}>Make a doll and join</Link>
      </p>
    </AuthLayout>
  );
}

export default LoginPage;
