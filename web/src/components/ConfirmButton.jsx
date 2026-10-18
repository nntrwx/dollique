import { useState } from 'react';

// A button that asks "Sure?" in place before doing something that cannot be undone.
function ConfirmButton({
  children, question = 'Sure?', confirmLabel = 'Yes', onConfirm, className = 'nbtn nbtn--sm',
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!asking) {
    return (
      <button type="button" className={className} onClick={() => setAsking(true)}>
        {children}
      </button>
    );
  }

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setAsking(false);
    }
  };

  return (
    <span className="confirm">
      <span className="confirm__question">{question}</span>
      <button type="button" className={`${className} confirm__yes`} disabled={busy} onClick={confirm}>
        {busy ? '…' : confirmLabel}
      </button>
      <button type="button" className={className} disabled={busy} onClick={() => setAsking(false)}>
        No
      </button>
    </span>
  );
}

export default ConfirmButton;
