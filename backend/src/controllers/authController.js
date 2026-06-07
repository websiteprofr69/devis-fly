// backend/src/controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_production_32chars_min';
const JWT_EXPIRES = '8h';

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export function register(req, res) {
  const { name, email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (exists) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });

  const hash = bcrypt.hashSync(password, 12);
  const result = db.prepare(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
  ).run(name?.trim() || null, normalizedEmail, hash, 'user');

  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

  return res.status(201).json({ token, user: publicUser(user) });
}

export function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  return res.json({ token, user: publicUser(user) });
}

export function me(req, res) {
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
  return user ? res.json(user) : res.status(404).json({ error: 'Utilisateur introuvable.' });
}

export function getTemplate(req, res) {
  const row = db.prepare('SELECT template_json FROM users WHERE id = ?').get(req.user.id);
  if (!row?.template_json) return res.json(null);
  try {
    return res.json(JSON.parse(row.template_json));
  } catch {
    return res.json(null);
  }
}

export function saveTemplate(req, res) {
  const { lines, region } = req.body;
  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'Ajoutez au moins une ligne au modèle.' });
  }

  const payload = JSON.stringify({ lines, region: region || null });
  db.prepare('UPDATE users SET template_json = ? WHERE id = ?').run(payload, req.user.id);
  return res.json({ success: true });
}
