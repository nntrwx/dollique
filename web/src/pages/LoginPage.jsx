import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';

import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import { login } from '../store/authSlice';
import { isValid } from '../utils/validators';

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
    <AuthLayout path="sign-in" title="Welcome back" subtitle="sign in to ask & answer">
      {location.state?.message && <p className="alert alert--success">{location.state.message}</p>}
      {serverError && <p className="alert alert--error" role="alert">{serverError}</p>}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <FormField
          label="Login or email"
          name="identifier"
          autoComplete="username"
          value={values.identifier}
          error={errors.identifier}
          onChange={handleChange}
        />
        <FormField
          label="Password"
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
        <button className="button button--primary button--wide" type="submit" disabled={sending}>
          {sending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="auth__footer">
        New here?
        {' '}
        <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  );
}

export default LoginPage;
