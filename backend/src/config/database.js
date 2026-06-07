// backend/src/config/database.js
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/devis.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema Initialization ─────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT,
    email     TEXT    UNIQUE NOT NULL,
    password  TEXT    NOT NULL,
    role      TEXT    NOT NULL DEFAULT 'user',
    created_at TEXT   DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pricing_grid (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    region       TEXT NOT NULL,
    prestationType TEXT NOT NULL,
    unit         TEXT NOT NULL DEFAULT 'm2',
    price_ht     REAL NOT NULL,
    tva_rate     REAL NOT NULL DEFAULT 0.10,
    updated_at   TEXT DEFAULT (datetime('now')),
    UNIQUE(region, prestationType)
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER REFERENCES users(id),
    client_name  TEXT,
    client_email TEXT,
    source       TEXT NOT NULL DEFAULT 'ai',
    status       TEXT NOT NULL DEFAULT 'draft',
    region       TEXT,
    total_ht     REAL,
    total_ttc    REAL,
    lines_json   TEXT NOT NULL DEFAULT '[]',
    prompt_used  TEXT,
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
  );
`);

// ── Migrations (bases existantes) ────────────────────────────────────────────
const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userCols.includes('name')) db.exec('ALTER TABLE users ADD COLUMN name TEXT');
if (!userCols.includes('template_json')) db.exec('ALTER TABLE users ADD COLUMN template_json TEXT');

const quoteCols = db.prepare('PRAGMA table_info(quotes)').all().map((c) => c.name);
if (!quoteCols.includes('user_id')) db.exec('ALTER TABLE quotes ADD COLUMN user_id INTEGER REFERENCES users(id)');

// ── Seed Default Pricing Grid ────────────────────────────────────────────────
const seedCount = db.prepare('SELECT COUNT(*) as c FROM pricing_grid').get();
if (seedCount.c === 0) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO pricing_grid (region, prestationType, unit, price_ht, tva_rate)
    VALUES (@region, @prestationType, @unit, @price_ht, @tva_rate)
  `);
  const seedMany = db.transaction((rows) => rows.forEach((r) => insert.run(r)));

  const PRESTATION_TYPES = ['Dépose toiture', 'Pose charpente', 'Remontage tuiles', 'Isolation', 'Évacuation gravats', 'Étanchéité'];
  const REGIONS = ['Île-de-France', 'Rhône-Alpes', 'PACA', 'Bretagne', 'Occitanie'];
  const BASE_PRICES = {
    'Dépose toiture': 18, 'Pose charpente': 45, 'Remontage tuiles': 35,
    'Isolation': 28, 'Évacuation gravats': 12, 'Étanchéité': 40,
  };
  const REGION_COEFF = {
    'Île-de-France': 1.35, 'Rhône-Alpes': 1.10, 'PACA': 1.15,
    'Bretagne': 0.95, 'Occitanie': 0.92,
  };

  const rows = [];
  for (const region of REGIONS) {
    for (const prestation of PRESTATION_TYPES) {
      rows.push({
        region,
        prestationType: prestation,
        unit: prestation === 'Évacuation gravats' ? 'forfait' : 'm2',
        price_ht: +(BASE_PRICES[prestation] * REGION_COEFF[region]).toFixed(2),
        tva_rate: 0.10,
      });
    }
  }
  seedMany(rows);
  console.log('✅ Pricing grid seeded');
}

// ── Seed Default Admin ───────────────────────────────────────────────────────
import bcrypt from 'bcryptjs';
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@devispro.fr');
if (!adminExists) {
  const hash = bcrypt.hashSync('Admin1234!', 12);
  db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)').run('admin@devispro.fr', hash, 'admin');
  console.log('✅ Default admin created: admin@devispro.fr / Admin1234!');
}

export default db;
