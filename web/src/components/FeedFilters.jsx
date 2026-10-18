import { useEffect, useRef, useState } from 'react';

import { formatDate } from '../utils/format';
import Dropdown from './Dropdown';
import Pixel from './Pixel';
import RangeCalendar from './RangeCalendar';

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

// Date range in a small glass popover with our own calendar under its capsule.
function DateFilter({ dateFrom, dateTo, onChange }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

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

  const change = (range) => {
    onChange(range);
    // the range is complete, so the popover can go
    if (range.from && range.to) setOpen(false);
  };

  return (
    <span className={`datef${open ? ' datef--open' : ''}`} ref={boxRef}>
      <button type="button" className="field dd__btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        Date
        {' '}
        <b>{dateLabel(dateFrom, dateTo)}</b>
        <span className="dd__caret" aria-hidden="true">
          <Pixel name="right" size={7} />
        </span>
      </button>
      {open && (
        <div className="datef__pop glass">
          <RangeCalendar from={dateFrom} to={dateTo} onChange={change} />
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
      <Dropdown
        label="Order"
        ariaLabel="Order"
        value={order}
        options={[
          { value: 'desc', label: ORDER_LABELS[sort].desc },
          { value: 'asc', label: ORDER_LABELS[sort].asc },
        ]}
        onChange={(next) => onChange({ order: next === 'desc' ? '' : 'asc' })}
      />

      <DateFilter dateFrom={dateFrom} dateTo={dateTo} onChange={onChange} />

      {showStatus && (
        <Dropdown
          label="Status"
          ariaLabel="Status"
          className="dd--right"
          value={status}
          options={statusOptions}
          onChange={(next) => onChange({ status: next })}
        />
      )}
    </div>
  );
}

export default FeedFilters;
