import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { api } from '../api/client';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import { selectCurrentUser } from '../store/authSlice';
import { validateEmail } from '../utils/validators';

// Step 1 of the password reset: ask for the email and send the link.
// Signed-in users also come here to change their password (the API has no separate endpoint).
function ForgotPasswordPage() {
  const user = useSelector(selectCurrentUser);
  const [email, setEmail] = useState(user?.email || '');
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const emailError = validateEmail(email.trim());
    setError(emailError);
    setServerError('');
    if (emailError) return;

    setSending(true);
    try {
      await api.post('/auth/password-reset', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout path="password" title="Check your inbox">
        <p className="alert alert--success">
          If an account with this email exists, we sent a link to set a new password.
          The link works for 1 hour.
        </p>
        <Link to="/login" className="button button--primary button--wide">Back to sign in</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      path="password"
      title={user ? 'Change password' : 'Forgot password?'}
      subtitle="we will email you a link"
    >
      {serverError && <p className="alert alert--error" role="alert">{serverError}</p>}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={100}
          value={email}
          error={error}
          onChange={(event) => {
            setEmail(event.target.value);
            setError('');
          }}
        />
        <button className="button button--primary button--wide" type="submit" disabled={sending}>
          {sending ? 'Sending…' : 'Send link'}
        </button>
      </form>

      {!user && (
        <p className="auth__footer">
          Remembered it?
          {' '}
          <Link to="/login">Sign in</Link>
        </p>
      )}
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
