const LOGIN_PATTERN = /^[a-zA-Z0-9_.-]{3,50}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLogin(login) {
  if (typeof login !== 'string' || !LOGIN_PATTERN.test(login)) {
    return 'Login must be 3-50 characters: latin letters, digits, "_", "." or "-".';
  }
  return null;
}

function validateEmail(email) {
  if (typeof email !== 'string' || email.length > 255 || !EMAIL_PATTERN.test(email)) {
    return 'Invalid email address format.';
  }
  return null;
}

module.exports = { validateLogin, validateEmail };
