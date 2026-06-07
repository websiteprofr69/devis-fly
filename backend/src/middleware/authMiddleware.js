// backend/src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_production_32chars_min';

export function protect(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }
  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
}
