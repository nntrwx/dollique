import { useId, useState } from 'react';

// Labelled input with an error message under it.
// type="password" gets a show/hide toggle.
function FormField({
  label, type = 'text', error = '', hint = '', ...inputProps
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const describedBy = error ? `${id}-error` : undefined;

  return (
    <div className={`field${error ? ' field--invalid' : ''}`}>
      <label className="field__label" htmlFor={id}>{label}</label>
      <div className="field__control">
        <input
          id={id}
          className="field__input"
          type={isPassword && visible ? 'text' : type}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {isPassword && (
          <button
            className="field__toggle"
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {error && <p className="field__error" id={describedBy}>{error}</p>}
      {!error && hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

export default FormField;
