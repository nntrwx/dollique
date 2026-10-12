import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { api, saveToken } from '../api/client';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import { fetchCurrentUser, selectCurrentUser } from '../store/authSlice';
import {
  isValid, validatePassword, validatePasswordConfirmation,
} from '../utils/validators';

// Step 2 of the password reset: the page opened from the email link.
function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  // 'checking' -> 'valid' | 'invalid'
  const [tokenState, setTokenState] = useState('checking');
  const [values, setValues] = useState({ password: '', passwordConfirmation: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get(`/auth/password-reset/${encodeURIComponent(token)}`)
      .then(() => setTokenState('valid'))
      .catch(() => setTokenState('invalid'));
  }, [token]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      password: validatePassword(values.password),
      passwordConfirmation: validatePasswordConfirmation(values.password, values.passwordConfirmation),
    };
    setErrors(nextErrors);
    setServerError('');
    if (!isValid(nextErrors)) return;

    setSending(true);
    try {
      await api.post(`/auth/password-reset/${encodeURIComponent(token)}`, {
        password: values.password,
        password_confirmation: values.passwordConfirmation,
      });
      // The API signs the user out everywhere after a password change.
      if (user) {
        saveToken(null);
        dispatch(fetchCurrentUser());
      }
      navigate('/login', {
        replace: true,
        state: { message: 'Your password was changed. Sign in with the new one.' },
      });
    } catch (error) {
      setServerError(error.message);
    } finally {
      setSending(false);
    }
  };

  if (tokenState === 'checking') {
    return (
      <AuthLayout path="password" title="New password">
        <p className="muted">Checking the link…</p>
      </AuthLayout>
    );
  }

  if (tokenState === 'invalid') {
    return (
      <AuthLayout path="password" title="Link expired">
        <p className="alert alert--error">
          This link is invalid or has expired. Reset links work for 1 hour and only once.
        </p>
        <Link to="/password-reset" className="button button--primary button--wide">Send a new link</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout path="password" title="New password" subtitle="choose a new password">
      {serverError && <p className="alert alert--error" role="alert">{serverError}</p>}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <FormField
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          error={errors.password}
          hint="At least 6 characters"
          onChange={handleChange}
        />
        <FormField
          label="Repeat new password"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          value={values.passwordConfirmation}
          error={errors.passwordConfirmation}
          onChange={handleChange}
        />
        <button className="button button--primary button--wide" type="submit" disabled={sending}>
          {sending ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
