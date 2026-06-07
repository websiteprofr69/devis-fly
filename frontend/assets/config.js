// Fly.io = même domaine (/api). Netlify ou autre = API sur Fly. Local = localhost:3001.
const FLY_API = 'https://devis.fly.dev/api';

window.DEVISPRO_API = (() => {
  const { hostname, port, protocol } = window.location;
  if (protocol === 'file:' || !hostname) return 'http://localhost:3001/api';
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return (port === '3001' || port === '8080') ? '/api' : 'http://localhost:3001/api';
  }
  if (hostname.endsWith('.fly.dev')) return '/api';
  return FLY_API;
})();
