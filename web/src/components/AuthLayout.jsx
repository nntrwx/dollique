import { useCallback, useEffect, useState } from 'react';

import { api } from '../api/client';
import Bow from './Bow';
import DollFigure from './DollFigure';
import './AuthLayout.css';

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

// Builds a random doll from the public parts catalog: a base, hair, outfit, shoes
// and sometimes one accessory.
function randomDoll(parts) {
  const byCategory = (category) => parts.filter((part) => part.category === category);
  const doll = [];
  ['base', 'hair', 'outfit', 'shoes'].forEach((category) => {
    const options = byCategory(category);
    if (options.length) doll.push(pickRandom(options));
  });
  const accessories = byCategory('accessory');
  if (accessories.length && Math.random() < 0.6) doll.push(pickRandom(accessories));
  return doll;
}

// Glass window for sign in / sign up / password pages (same look as the admin login):
// a dress-up doll on the left, the form on the right.
function AuthLayout({
  title, subtitle = '', path = 'welcome', children,
}) {
  const [parts, setParts] = useState([]);
  const [doll, setDoll] = useState([]);

  useEffect(() => {
    api.get('/doll-parts')
      .then((data) => {
        setParts(data);
        setDoll(randomDoll(data));
      })
      .catch(() => setParts([]));
  }, []);

  const shuffle = useCallback(() => setDoll(randomDoll(parts)), [parts]);

  return (
    <div className="auth glass">
      <div className="auth__bar">
        <span>
          dollique /
          {' '}
          {path}
        </span>
        <span className="auth__dots" aria-hidden="true">
          <i />
          <i />
        </span>
      </div>

      <div className="auth__body">
        <aside className="auth__showcase">
          <p className="auth__tagline">† every doll has a story †</p>
          {doll.length > 0 && (
            <>
              <DollFigure layers={doll} label="A randomly dressed doll" />
              <button className="auth__shuffle" type="button" onClick={shuffle}>
                ✦ dress up again
              </button>
            </>
          )}
        </aside>

        <section className="auth__card">
          <Bow className="bow auth__bow" />
          <h1 className="auth__title">{title}</h1>
          {subtitle ? <p className="auth__subtitle">{subtitle}</p> : <div className="auth__subtitle" />}
          {children}
        </section>
      </div>
    </div>
  );
}

export default AuthLayout;
