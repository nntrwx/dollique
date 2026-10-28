import { useEffect, useState } from 'react';

import { onLiveChange } from '../api/live';

// A number that goes up when the server says something of these kinds changed
// ('posts', 'comments', 'categories', 'users', 'appeals', see api/live.js).
// Put it in an effect's dependencies, and the effect loads its data again at once.
export default function useLiveVersion(...kinds) {
  const [version, setVersion] = useState(0);
  const key = kinds.join(',');

  useEffect(() => {
    let pending = null;
    const wanted = key.split(',');
    const stop = onLiveChange((event) => {
      if (!wanted.includes(event.kind)) return;
      clearTimeout(pending);
      pending = setTimeout(() => setVersion((value) => value + 1), 300);
    });
    return () => {
      clearTimeout(pending);
      stop();
    };
  }, [key]);

  return version;
}
