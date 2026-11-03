import { useEffect, useState } from 'react';

import { getUserDoll } from '../api/dolls';
import DollFigure from './DollFigure';
import Pixel from './Pixel';

export const DEFAULT_AVATAR = '/uploads/avatars/default.png';

function Avatar({
  src = null, alt, size = 38, userId = null, guest = false, className = '',
}) {
  const [doll, setDoll] = useState(null);

  useEffect(() => {
    if (!userId) {
      setDoll(null);
      return undefined;
    }
    let ignore = false;
    getUserDoll(userId).then((data) => {
      if (ignore) return;
      setDoll(data?.use_doll_as_avatar && data.layers?.length ? data.layers : null);
    });
    return () => {
      ignore = true;
    };
  }, [userId]);

  const style = { width: size, height: size };
  const classes = `ava${className ? ` ${className}` : ''}`;

  if (guest) {
    return (
      <span className={`${classes} ava--guest`} style={style} title={alt}>
        <Pixel name="bunny" color="#c98a9c" size={Math.round(size * 0.5)} />
      </span>
    );
  }

  if (doll) {
    return (
      <span className={classes} style={style} title={alt}>
        <DollFigure layers={doll} label={alt} />
      </span>
    );
  }

  return (
    <span className={classes} style={style}>
      <img
        src={src || DEFAULT_AVATAR}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={(event) => {
          // broken file -> default picture
          if (!event.currentTarget.src.endsWith(DEFAULT_AVATAR)) {
            event.currentTarget.src = DEFAULT_AVATAR;
          }
        }}
      />
    </span>
  );
}

export default Avatar;
