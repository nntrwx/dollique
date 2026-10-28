import { useEffect, useRef } from 'react';

import { onLiveChange } from '../api/live';

// Calls `refresh` as soon as the server says something changed (see api/live.js), and also
// every `ms` and when the user comes back to the tab, in case a live message was missed.
// Works only while the tab is open in front. Pass null to pause (for example while the page is still loading).
export default function usePolling(refresh, ms = 10000) {
  const saved = useRef(refresh);

  useEffect(() => {
    saved.current = refresh;
  }, [refresh]);

  useEffect(() => {
    let pending = null;
    const tick = () => {
      if (document.visibilityState === 'visible' && saved.current) saved.current();
    };
    // one change often comes as a few requests (a post, then its photos), so wait a moment and reload once
    const soon = () => {
      clearTimeout(pending);
      pending = setTimeout(tick, 300);
    };

    const timer = setInterval(tick, ms);
    const stopLive = onLiveChange(soon);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      clearTimeout(pending);
      stopLive();
      document.removeEventListener('visibilitychange', tick);
    };
  }, [ms]);
}
