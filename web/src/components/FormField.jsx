import { useId, useState } from 'react';

import Pixel from './Pixel';

// Labelled glass input with a little pixel icon on the left and an error or hint under it.
// type="password" gets an eye that shows or hides the text.
function FormField({
  label, optional = false, icon = null, type = 'text', error = '', hint = '', ok = '', children = null, ...inputProps
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const describedBy = error || hint ? `${id}-note` : undefined;

  return (
    <div className="fl">
      <label className="fl__label" htmlFor={id}>
        {label}
        {optional && <i> (optional)</i>}
      </label>
      <div className={`inp${error ? ' inp--invalid' : ''}`}>
        {icon && (
          <span className="inp__icon">
            <Pixel name={icon} size={14} />
          </span>
        )}
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {ok && !error && <span className="inp__ok">{`✓ ${ok}`}</span>}
        {isPassword && (
          <button
            className="inp__eye"
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            title={visible ? 'Hide password' : 'Show password'}
          >
            <Pixel name={visible ? 'eye' : 'eyeOff'} color="#5b5357" size={13} />
          </button>
        )}
      </div>
      {children}
      {error && <p className="fl__error" id={describedBy}>{error}</p>}
      {!error && hint && <p className="fl__hint" id={describedBy}>{hint}</p>}
    </div>
  );
}

export default FormField;
