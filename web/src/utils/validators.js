// Same rules as the API (API/src/utils/validators.js), so users see errors before sending.

const LOGIN_PATTERN = /^[a-zA-Z0-9_.-]{3,50}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(login) {
  if (!login) return 'Enter a login.';
  if (!LOGIN_PATTERN.test(login)) {
    return 'Login must be 3-50 characters: latin letters, digits, "_", "." or "-".';
  }
  return '';
}

export function validateEmail(email) {
  if (!email) return 'Enter an email.';
  if (email.length > 100 || !EMAIL_PATTERN.test(email)) return 'This does not look like an email.';
  return '';
}

export function validatePassword(password) {
  if (!password) return 'Enter a password.';
  if (password.length < 6) return 'Password must be at least 6 characters long.';
  return '';
}

export function validatePasswordConfirmation(password, confirmation) {
  if (!confirmation) return 'Repeat the password.';
  if (password !== confirmation) return 'Passwords do not match.';
  return '';
}

export function validateFullName(fullName) {
  if (fullName.length > 100) return 'Name must be at most 100 characters.';
  return '';
}

// Returns true when the errors object has no messages.
export function isValid(errors) {
  return Object.values(errors).every((message) => !message);
}
