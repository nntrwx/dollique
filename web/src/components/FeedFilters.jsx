import { useEffect, useRef, useState } from 'react';

import { formatDate } from '../utils/format';

const ORDER_LABELS = {
  date: { desc: 'newest first ↓', asc: 'oldest first ↑' },
  likes: { desc: 'most liked first ↓', asc: 'least liked first ↑' },
};

// Users see only their own hidden posts, admins see all of them.
function getStatusOptions(isAdmin) {
  return [
    { value: '', label: isAdmin ? 'all' : 'all I can see' },
    { value: 'active', label: 'active' },
    { value: 'inactive', label: isAdmin ? 'inactive' : 'my inactive' },
  ];
}

function dateLabel(from, to) {
  if (!from && !to) return 'any time';
  if (from && to) return `${formatDate(from)} – ${formatDate(to)}`;
  return from ? `from ${formatDate(from)}` : `until ${formatDate(to)}`;
}

// Date range in a small glass popover under its capsule.
function DateFilter({ dateFrom, dateTo, onChange }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const boxRef = useRef(null);
  const today = new Date().toISOString().slice(0, 10);

  // A click anywhere else or Esc closes the popover.
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !boxRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const change = (key, value) => {
    const from = key === 'from' ? value : dateFrom;
    const to = key === 'to' ? value : dateTo;
    if (from && to && from > to) {
      setError('"From" must be before "to".');
      return;
    }
    setError('');
    onChange({ [key]: value });
  };

  return (
    <span className="datef" ref={boxRef}>
      <button type="button" className="field" aria-expanded={open} onClick={() => setOpen(!open)}>
        Date
        {' '}
        <b>{dateLabel(dateFrom, dateTo)}</b>
      </button>
      {open && (
        <div className="datef__pop glass">
          <label>
            <span className="mono">from</span>
            <input type="date" max={dateTo || today} value={dateFrom} onChange={(event) => change('from', event.target.value)} />
          </label>
          <label>
            <span className="mono">to</span>
            <input type="date" min={dateFrom || undefined} max={today} value={dateTo} onChange={(event) => change('to', event.target.value)} />
          </label>
          {error && <p className="fl__error">{error}</p>}
          {(dateFrom || dateTo) && (
            <button type="button" className="link-button" onClick={() => onChange({ from: '', to: '' })}>× any time</button>
          )}
        </div>
      )}
    </span>
  );
}

// Order, date range and (for signed-in users) post status, as little glass capsules.
// Gets the current values from the URL and reports changes with onChange(patch).
function FeedFilters({
  sort, order, dateFrom, dateTo, status, showStatus, isAdmin = false, onChange,
}) {
  const statusOptions = getStatusOptions(isAdmin);

  return (
    <div className="filters">
      <label className="field">
        Order
        {' '}
        <b>{ORDER_LABELS[sort][order]}</b>
        <select value={order} aria-label="Order" onChange={(event) => onChange({ order: event.target.value === 'desc' ? '' : 'asc' })}>
          <option value="desc">{ORDER_LABELS[sort].desc}</option>
          <option value="asc">{ORDER_LABELS[sort].asc}</option>
        </select>
      </label>

      <DateFilter dateFrom={dateFrom} dateTo={dateTo} onChange={onChange} />

      {showStatus && (
        <label className="field">
          Status
          {' '}
          <b>{statusOptions.find((option) => option.value === status)?.label}</b>
          <select value={status} aria-label="Status" onChange={(event) => onChange({ status: event.target.value })}>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}

export default FeedFilters;
