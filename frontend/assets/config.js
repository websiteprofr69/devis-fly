// Même site Fly → /api. Dev local séparé → localhost:3001.
window.DEVISPRO_API = (() => {
  const { hostname, port, protocol } = window.location;
  if (protocol === 'file:' || !hostname) return 'http://localhost:3001/api';
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return (port === '3001' || port === '8080') ? '/api' : 'http://localhost:3001/api';
  }
  return '/api';
})();
