// backend/src/controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_production_32chars_min';
const JWT_EXPIRES = '8h';

export function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  return res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
}

export function me(req, res) {
  const user = db.prepare('SELECT id, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
  return user ? res.json(user) : res.status(404).json({ error: 'Utilisateur introuvable.' });
}
