import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { api } from '../api/client';
import AuthLayout from '../components/AuthLayout';

// The page opened from the confirmation email.
function ConfirmEmailPage() {
  const { token } = useParams();
  // 'sending' -> 'done' | 'failed'
  const [state, setState] = useState('sending');
  const [message, setMessage] = useState('');
  // A token works only once, so the request must not repeat
  // (React StrictMode runs effects twice in development).
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    api.post(`/auth/confirm-email/${encodeURIComponent(token)}`)
      .then(() => setState('done'))
      .catch((error) => {
        setMessage(error.message);
        setState('failed');
      });
  }, [token]);

  if (state === 'sending') {
    return (
      <AuthLayout path="email" title="Confirming your email">
        <p className="muted">One moment…</p>
      </AuthLayout>
    );
  }

  if (state === 'failed') {
    return (
      <AuthLayout path="email" title="Something went wrong">
        <p className="alert alert--error">
          {message}
          {' '}
          The link may have expired (it works for 24 hours) or was already used.
        </p>
        <Link to="/login" className="button button--primary button--wide">Try to sign in</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout path="email" title="Email confirmed" subtitle="welcome to dollique">
      <p className="alert alert--success">Your account is active. You can sign in now.</p>
      <Link to="/login" className="button button--primary button--wide">Sign in</Link>
    </AuthLayout>
  );
}

export default ConfirmEmailPage;
