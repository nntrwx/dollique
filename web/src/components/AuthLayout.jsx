import { useEffect, useState } from 'react';

import { getDollParts } from '../api/dolls';
import { layersOf, randomConfig } from '../utils/doll';
import DollFigure from './DollFigure';
import './AuthLayout.css';

// One glass card for sign in and the password / email pages:
// a doll on pink glass on the left, the form on the right.
// Without `doll` the left side shows a randomly dressed doll.
function AuthLayout({
  title,
  subtitle = '',
  path = 'welcome',
  heading = (
    <>
      Every doll
      <br />
      <em>has a story</em>
    </>
  ),
  text = 'Questions and answers about faceups, reroots, legit checks and shelf tours.',
  doll = null,
  bubble = null,
  children,
}) {
  const [parts, setParts] = useState([]);
  const [randomDoll, setRandomDoll] = useState(null);

  useEffect(() => {
    if (doll) return;
    getDollParts()
      .then((data) => {
        setParts(data);
        setRandomDoll(randomConfig(data));
      })
      .catch(() => setParts([]));
  }, [doll]);

  const layers = doll || layersOf(randomDoll, parts);

  return (
    <section className="auth glass">
      <div className="hello">
        <div className="mono">{`dollique / ${path}`}</div>
        <h2>{heading}</h2>
        <p>{text}</p>
        <div className="hero-doll">
          <img className="hero-doll__wings" src="/decor/dot-wings.svg" alt="" />
          {bubble && <span className="bubble">{bubble}</span>}
          {layers.length > 0 && <DollFigure layers={layers} label="A dressed-up doll" />}
          {!doll && parts.length > 0 && (
            <button type="button" className="hero-doll__shuffle link-button" onClick={() => setRandomDoll(randomConfig(parts))}>
              ✦ dress up again
            </button>
          )}
        </div>
      </div>

      <div className="auth__form">
        <h1 className="auth__title">{title}</h1>
        {subtitle && <p className="auth__lead">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}

export default AuthLayout;
