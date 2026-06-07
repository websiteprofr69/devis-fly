// backend/src/controllers/usersController.js
import db from '../config/database.js';

export function listUsers(req, res) {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.created_at,
           COUNT(q.id) AS quote_count,
           COALESCE(SUM(q.total_ttc), 0) AS total_ttc
    FROM users u
    LEFT JOIN quotes q ON q.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();
  return res.json(users);
}

export function getUserDetail(req, res) {
  const user = db.prepare(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?'
  ).get(req.params.id);

  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

  const quotes = db.prepare(`
    SELECT id, client_name, client_email, source, status, region, total_ht, total_ttc, created_at
    FROM quotes WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(user.id);

  const stats = db.prepare(`
    SELECT COUNT(*) AS quote_count, COALESCE(SUM(total_ttc), 0) AS total_ttc
    FROM quotes WHERE user_id = ?
  `).get(user.id);

  return res.json({ user, quotes, stats });
}
