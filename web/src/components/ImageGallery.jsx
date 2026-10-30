import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import Icon from './Icon';

const CLOSE_MS = 220;

function ImageGallery({ images, title }) {
  const [openIndex, setOpenIndex] = useState(null);
  const [closing, setClosing] = useState(false);
  const [loadedSrc, setLoadedSrc] = useState(null);
  const closeTimer = useRef(null);

  const close = () => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setClosing(false);
      setOpenIndex(null);
    }, CLOSE_MS);
  };

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (openIndex === null) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') setOpenIndex((index) => (index + 1) % images.length);
      if (event.key === 'ArrowLeft') setOpenIndex((index) => (index - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [openIndex, images.length, closing]);

  if (!images.length) return null;
  const [first, ...rest] = images;

  return (
    <>
      <figure className="photo">
        <button type="button" className="photo__img" onClick={() => setOpenIndex(0)} aria-label="Open the picture">
          <img
            src={first}
            alt={`${title}, picture 1`}
            className={loadedSrc === first ? undefined : 'is-loading'}
            onLoad={() => setLoadedSrc(first)}
          />
        </button>
        <span className="tape tape--1" />
        <span className="tape tape--2" />
        {images.length > 1 && <figcaption>{`1 / ${images.length}`}</figcaption>}
      </figure>

      {rest.length > 0 && (
        <div className="prints">
          {rest.map((src, index) => (
            <button key={src} type="button" className="prints__item" onClick={() => setOpenIndex(index + 1)}>
              <img src={src} alt={`${title}, picture ${index + 2}`} loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {openIndex !== null && createPortal(
        <div className={`lightbox${closing ? ' lightbox--closing' : ''}`} role="dialog" aria-label="Picture" onClick={close}>
          <img
            key={images[openIndex]}
            className="lightbox__img"
            src={images[openIndex]}
            alt={`${title}, picture ${openIndex + 1}`}
          />
          <button type="button" className="icon-button lightbox__close" aria-label="Close">
            <Icon name="close" />
          </button>
          {images.length > 1 && (
            <span className="lightbox__count">{`${openIndex + 1} / ${images.length}`}</span>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

export default ImageGallery;
