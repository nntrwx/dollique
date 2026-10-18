import {
  useEffect, useId, useRef, useState,
} from 'react';

import Pixel from './Pixel';
import './Dropdown.css';

const MENU_GAP = 8;

// Our own select: a glass capsule that opens a small glass list with a soft pop.
// options: [{ value, label }]. Works with the keyboard: arrows, Enter, Esc, Tab.
function Dropdown({
  label = null, value, options, onChange, ariaLabel, className = '',
}) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [focus, setFocus] = useState(0);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const itemRefs = useRef([]);
  const listId = useId();
  const current = options.find((option) => String(option.value) === String(value)) || options[0];

  const openMenu = () => {
    // open upwards when there is no room under the button (the "per page" picker at the bottom)
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = options.length * 38 + 16;
    setUp(window.innerHeight - rect.bottom < menuHeight + MENU_GAP && rect.top > menuHeight);
    setFocus(Math.max(0, options.indexOf(current)));
    setOpen(true);
  };

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  const pick = (option) => {
    if (String(option.value) !== String(value)) onChange(option.value);
    close();
  };

  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => {
      if (!rootRef.current?.contains(event.target)) close(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  useEffect(() => {
    if (open) itemRefs.current[focus]?.focus();
  }, [open, focus]);

  const onMenuKey = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setFocus((index) => (index + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocus((index) => (index - 1 + options.length) % options.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setFocus(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setFocus(options.length - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      close(false);
    }
  };

  return (
    <div className={`dd${open ? ' dd--open' : ''}${className ? ` ${className}` : ''}`} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="field dd__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel ? `${ariaLabel}: ${current?.label}` : undefined}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            openMenu();
          }
        }}
      >
        {label}
        {label && ' '}
        <b>{current?.label}</b>
        <span className="dd__caret" aria-hidden="true">
          <Pixel name="right" size={7} />
        </span>
      </button>

      {open && (
        <ul id={listId} className={`dd__menu${up ? ' dd__menu--up' : ''}`} role="listbox" aria-label={ariaLabel} onKeyDown={onMenuKey}>
          {options.map((option, index) => {
            const selected = option === current;
            return (
              <li key={option.value} role="presentation">
                <button
                  ref={(element) => { itemRefs.current[index] = element; }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  tabIndex={index === focus ? 0 : -1}
                  className={`dd__item${selected ? ' on' : ''}`}
                  onClick={() => pick(option)}
                  onMouseEnter={() => setFocus(index)}
                >
                  <span>{option.label}</span>
                  {selected && <Pixel name="tick" size={9} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Dropdown;
