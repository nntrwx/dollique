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
