import { useEffect, useState } from 'react';

import Icon from './Icon';

// Post pictures: the first one taped onto the page, the rest as small prints under it.
// A click opens the picture full size; Esc, a click or the arrows move around.
function ImageGallery({ images, title }) {
  const [openIndex, setOpenIndex] = useState(null);

  useEffect(() => {
    if (openIndex === null) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpenIndex(null);
      if (event.key === 'ArrowRight') setOpenIndex((index) => (index + 1) % images.length);
      if (event.key === 'ArrowLeft') setOpenIndex((index) => (index - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [openIndex, images.length]);

  if (!images.length) return null;
  const [first, ...rest] = images;

  return (
    <>
      <figure className="photo">
        <button type="button" className="photo__img" onClick={() => setOpenIndex(0)} aria-label="Open the picture">
          <img src={first} alt={`${title}, picture 1`} />
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

      {openIndex !== null && (
        <div className="lightbox" role="dialog" aria-label="Picture" onClick={() => setOpenIndex(null)}>
          <img src={images[openIndex]} alt={`${title}, picture ${openIndex + 1}`} />
          <button type="button" className="icon-button lightbox__close" aria-label="Close">
            <Icon name="close" />
          </button>
          {images.length > 1 && (
            <span className="lightbox__count">{`${openIndex + 1} / ${images.length}`}</span>
          )}
        </div>
      )}
    </>
  );
}

export default ImageGallery;
