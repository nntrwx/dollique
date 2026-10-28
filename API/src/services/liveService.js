// Live updates with server-sent events (SSE): every open tab keeps one GET /api/events
// connection, and after any change (a new post, comment, like, category...) the server
// tells all of them what changed, so they reload that part of the page at once.
const clients = new Set();

// GET /api/events
function subscribe(req, res) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();
  // the browser reconnects by itself after 3 s if the server restarts
  res.write('retry: 3000\n\n');
  clients.add(res);

  // a comment line now and then, so proxies don't close a quiet connection
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => {
    clearInterval(ping);
    clients.delete(res);
  });
}

function broadcast(event) {
  const message = `data: ${JSON.stringify(event)}\n\n`;
  clients.forEach((res) => res.write(message));
}

// Middleware for a router: after a POST/PATCH/DELETE that went well,
// tells everyone which kind of thing changed and at which path.
function announceChanges(kind) {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      res.on('finish', () => {
        if (res.statusCode < 400) broadcast({ kind, path: req.originalUrl.split('?')[0] });
      });
    }
    next();
  };
}

module.exports = { subscribe, broadcast, announceChanges };
