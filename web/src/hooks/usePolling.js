import { useEffect, useRef } from 'react';

import { onLiveChange } from '../api/live';

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
    // one change can be several requests, so reload once after a short pause
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
