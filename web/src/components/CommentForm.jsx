import { useState } from 'react';

const MAX_LENGTH = 5000;

// Text box for a new comment, a reply or an edit.
// onSubmit(text) must return a promise; its error message is shown under the field.
function CommentForm({
  initialText = '', submitLabel = 'Send', placeholder = 'Add a comment…', onSubmit, onCancel = null, autoFocus = false,
}) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clean = text.trim();
    if (!clean) {
      setError('The comment is empty.');
      return;
    }
    if (clean.length > MAX_LENGTH) {
      setError(`The comment must be at most ${MAX_LENGTH} characters.`);
      return;
    }

    setSending(true);
    setError('');
    try {
      await onSubmit(clean);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="cform" onSubmit={handleSubmit} noValidate>
      <textarea
        className={`textarea${error ? ' textarea--invalid' : ''}`}
        rows={3}
        placeholder={placeholder}
        aria-label={placeholder}
        value={text}
        maxLength={MAX_LENGTH + 100}
        autoFocus={autoFocus}
        onChange={(event) => {
          setText(event.target.value);
          if (error) setError('');
        }}
      />
      <div className="cform__row">
        <span className={`mono${text.length > MAX_LENGTH ? ' error-text' : ''}`}>
          {text.length ? `${text.length} / ${MAX_LENGTH}` : 'be kind ♡'}
        </span>
        {error && <span className="fl__error">{error}</span>}
        <span className="cform__actions">
          {onCancel && (
            <button type="button" className="link-button" onClick={onCancel} disabled={sending}>Cancel</button>
          )}
          <button type="submit" className="nbtn nbtn--ink nbtn--sm" disabled={sending}>
            {sending ? 'Sending…' : submitLabel}
            {' '}
            <span className="spark">✦</span>
          </button>
        </span>
      </div>
    </form>
  );
}

export default CommentForm;
