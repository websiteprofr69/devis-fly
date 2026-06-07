// backend/src/middleware/errorHandler.js
export function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Erreur serveur interne.';
  return res.status(status).json({ error: message });
}
