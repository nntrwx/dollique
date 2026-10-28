// One shared connection to GET /api/events for the whole tab. The server sends a small
// message after every change (a new post, comment, like...), and each listener decides
// whether to reload. The connection is opened by the first listener and closed by the last.
const listeners = new Set();
let source = null;

export function onLiveChange(listener) {
  listeners.add(listener);

  if (!source && typeof EventSource !== 'undefined') {
    source = new EventSource('/api/events');
    source.onmessage = (message) => {
      let event;
      try {
        event = JSON.parse(message.data);
      } catch {
        return;
      }
      listeners.forEach((fn) => fn(event));
    };
  }

  return () => {
    listeners.delete(listener);
    if (!listeners.size && source) {
      source.close();
      source = null;
    }
  };
}
