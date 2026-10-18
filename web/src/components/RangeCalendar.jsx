import { useState } from 'react';

import Pixel from './Pixel';
import './RangeCalendar.css';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// 'YYYY-MM-DD' in local time (toISOString would shift the day for UTC+ zones)
function toKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// 6 weeks starting on the Monday on or before the 1st of the month
function monthDays(year, month) {
  const first = new Date(year, month, 1);
  const shift = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => new Date(year, month, 1 - shift + index));
}

// A small month calendar for picking a date range: the first click picks the start,
// the second one the end. Days after today can't be picked.
// onChange({ from, to }) gets 'YYYY-MM-DD' strings ('' for none).
function RangeCalendar({ from, to, onChange }) {
  const today = toKey(new Date());
  const startMonth = fromKey(to || from || today);
  const [view, setView] = useState({ year: startMonth.getFullYear(), month: startMonth.getMonth() });
  const [hover, setHover] = useState('');
  // after a start day is picked the next click picks the end
  const picking = from && !to ? 'to' : 'from';

  const move = (step) => {
    const next = new Date(view.year, view.month + step, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  };
  const atToday = view.year === Number(today.slice(0, 4)) && view.month === Number(today.slice(5, 7)) - 1;

  const pick = (key) => {
    if (picking === 'to' && key >= from) onChange({ from, to: key });
    else onChange({ from: key, to: '' });
  };

  // while choosing the end, the hovered day previews the range
  const rangeEnd = to || (picking === 'to' && hover >= from ? hover : '');
  const title = new Date(view.year, view.month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="cal" onMouseLeave={() => setHover('')}>
      <div className="cal__head">
        <button type="button" className="cal__nav" aria-label="Previous month" onClick={() => move(-1)}>
          <Pixel name="left" size={8} />
        </button>
        <b className="cal__title" aria-live="polite">{title}</b>
        <button type="button" className="cal__nav" aria-label="Next month" disabled={atToday} onClick={() => move(1)}>
          <Pixel name="right" size={8} />
        </button>
      </div>

      <div className="cal__grid" role="grid" aria-label={title}>
        {WEEKDAYS.map((day) => <span key={day} className="cal__wd mono">{day}</span>)}
        {monthDays(view.year, view.month).map((date, index) => {
          const key = toKey(date);
          const classes = ['cal__day'];
          // the ribbon gets round ends at the edges of a week
          if (index % 7 === 0) classes.push('cal__day--mon');
          if (index % 7 === 6) classes.push('cal__day--sun');
          if (date.getMonth() !== view.month) classes.push('cal__day--out');
          if (key === today) classes.push('cal__day--today');
          if (from && rangeEnd && key > from && key < rangeEnd) classes.push('cal__day--in');
          if (key === from) classes.push('cal__day--start');
          if (key === rangeEnd || (key === from && !rangeEnd)) classes.push('cal__day--end');
          if (from && rangeEnd && from !== rangeEnd && (key === from || key === rangeEnd)) classes.push('cal__day--edge');
          return (
            <button
              key={key}
              type="button"
              className={classes.join(' ')}
              disabled={key > today}
              aria-pressed={key === from || key === to}
              aria-label={date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              onClick={() => pick(key)}
              onMouseEnter={() => setHover(key)}
            >
              <span>{date.getDate()}</span>
            </button>
          );
        })}
      </div>

      <p className="cal__hint mono">{picking === 'to' ? 'now pick the last day' : (to ? 'pick a day to start over' : 'pick the first day')}</p>
    </div>
  );
}

export default RangeCalendar;
