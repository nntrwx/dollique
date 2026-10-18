import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import Pixel from './Pixel';
import './ConfirmDialog.css';

// "Are you sure?" window over the page: a glass card that pops in, the page fades behind it.
// Esc or a click outside cancels; the safe button gets the focus first.
function ConfirmDialog({
  title, children, confirmLabel = 'Yes', cancelLabel = 'Cancel', danger = false, busy = false, onConfirm, onCancel,
}) {
  const cancelRef = useRef(null);
  // the latest props for the key handler, so the effect runs only once
  const latest = useRef({ busy, onCancel });
  latest.current = { busy, onCancel };

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape' && !latest.current.busy) latest.current.onCancel();
    };
    window.addEventListener('keydown', onKey);
    // the page under the window should not scroll
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  return createPortal(
    <div className="cdialog" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !busy && onCancel()}>
      <div className={`cdialog__card glass${danger ? ' cdialog__card--danger' : ''}`} role="alertdialog" aria-modal="true" aria-labelledby="cdialog-title">
        <span className="cdialog__icon"><Pixel name={danger ? 'broken' : 'heart'} size={22} /></span>
        <h2 id="cdialog-title">{title}</h2>
        <div className="cdialog__text">{children}</div>
        <div className="cdialog__actions">
          <button ref={cancelRef} type="button" className="nbtn nbtn--sm" disabled={busy} onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={`nbtn nbtn--sm ${danger ? 'nbtn--danger' : 'nbtn--ink'}`} disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ConfirmDialog;
