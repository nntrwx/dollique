import { useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../api/client';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
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

function RegisterPage() {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState('');

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
      <AuthLayout path="sign-up" title="Check your inbox" subtitle="one last step">
        <p className="alert alert--success">
          We sent a confirmation link to
          {' '}
          <strong>{sentTo}</strong>
          . Open it to activate your account, then sign in.
        </p>
        <Link to="/login" className="button button--primary button--wide">Go to sign in</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout path="sign-up" title="Join Dollique" subtitle="create your account">
      {serverError && <p className="alert alert--error" role="alert">{serverError}</p>}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <FormField
          label="Login"
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
          label="Display name (optional)"
          name="fullName"
          autoComplete="name"
          maxLength={100}
          value={values.fullName}
          error={errors.fullName}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={255}
          value={values.email}
          error={errors.email}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          error={errors.password}
          hint="At least 6 characters"
          onChange={handleChange}
          onBlur={handleBlur}
        />
        <FormField
          label="Repeat password"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          value={values.passwordConfirmation}
          error={errors.passwordConfirmation}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        <button className="button button--primary button--wide" type="submit" disabled={sending}>
          {sending ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      <p className="auth__footer">
        Already have an account?
        {' '}
        <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

export default RegisterPage;
