// backend/src/controllers/quoteController.js
import db from '../config/database.js';

function canAccessQuote(user, quote) {
  return user.role === 'admin' || quote.user_id === user.id;
}

export function saveQuote(req, res) {
  const { client_name, client_email, source, region, lines, prompt_used } = req.body;
  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'Le devis doit contenir au moins une ligne.' });
  }

  const total_ht = +lines.reduce((s, l) => s + (l.total_ht || 0), 0).toFixed(2);
  const total_ttc = +lines.reduce((s, l) => s + (l.total_ttc || 0), 0).toFixed(2);

  const result = db.prepare(`
    INSERT INTO quotes (user_id, client_name, client_email, source, region, total_ht, total_ttc, lines_json, prompt_used)
    VALUES (@user_id, @client_name, @client_email, @source, @region, @total_ht, @total_ttc, @lines_json, @prompt_used)
  `).run({
    user_id: req.user.id,
    client_name: client_name || null,
    client_email: client_email || null,
    source: source || 'manual',
    region: region || null,
    total_ht,
    total_ttc,
    lines_json: JSON.stringify(lines),
    prompt_used: prompt_used || null,
  });

  return res.status(201).json({ id: result.lastInsertRowid, total_ht, total_ttc });
}

export function listQuotes(req, res) {
  const { search, source, user_id, limit = 50, offset = 0 } = req.query;
  let query = `
    SELECT q.id, q.user_id, q.client_name, q.client_email, q.source, q.status, q.region,
           q.total_ht, q.total_ttc, q.created_at,
           u.name AS user_name, u.email AS user_email
    FROM quotes q
    LEFT JOIN users u ON u.id = q.user_id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role !== 'admin') {
    query += ' AND q.user_id = ?';
    params.push(req.user.id);
  } else if (user_id) {
    query += ' AND q.user_id = ?';
    params.push(Number(user_id));
  }

  if (search) {
    query += ' AND (q.client_name LIKE ? OR q.client_email LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (source) {
    query += ' AND q.source = ?';
    params.push(source);
  }

  query += ' ORDER BY q.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const quotes = db.prepare(query).all(...params);

  let countQuery = 'SELECT COUNT(*) as c FROM quotes q LEFT JOIN users u ON u.id = q.user_id WHERE 1=1';
  const countParams = [];
  if (req.user.role !== 'admin') {
    countQuery += ' AND q.user_id = ?';
    countParams.push(req.user.id);
  } else if (user_id) {
    countQuery += ' AND q.user_id = ?';
    countParams.push(Number(user_id));
  }
  const total = db.prepare(countQuery).get(...countParams).c;

  return res.json({ quotes, total });
}

export function updateQuote(req, res) {
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
  if (!quote) return res.status(404).json({ error: 'Devis introuvable.' });
  if (!canAccessQuote(req.user, quote)) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }

  const { client_name, client_email, region, lines } = req.body;
  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'Le devis doit contenir au moins une ligne.' });
  }

  const total_ht = +lines.reduce((s, l) => s + (l.total_ht || 0), 0).toFixed(2);
  const total_ttc = +lines.reduce((s, l) => s + (l.total_ttc || 0), 0).toFixed(2);

  db.prepare(`
    UPDATE quotes
    SET client_name = @client_name, client_email = @client_email, region = @region,
        total_ht = @total_ht, total_ttc = @total_ttc, lines_json = @lines_json,
        updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id: quote.id,
    client_name: client_name ?? quote.client_name,
    client_email: client_email ?? quote.client_email,
    region: region ?? quote.region,
    total_ht,
    total_ttc,
    lines_json: JSON.stringify(lines),
  });

  return res.json({ success: true, id: quote.id, total_ht, total_ttc });
}

export function getQuote(req, res) {
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
  if (!quote) return res.status(404).json({ error: 'Devis introuvable.' });
  if (!canAccessQuote(req.user, quote)) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }
  quote.lines = JSON.parse(quote.lines_json);
  delete quote.lines_json;
  return res.json(quote);
}

export function updateQuoteStatus(req, res) {
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
  if (!quote) return res.status(404).json({ error: 'Devis introuvable.' });
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Seul un admin peut modifier le statut.' });
  }

  const { status } = req.body;
  const valid = ['draft', 'sent', 'accepted', 'rejected'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Statut invalide.' });

  db.prepare('UPDATE quotes SET status = ?, updated_at = datetime("now") WHERE id = ?').run(status, req.params.id);
  return res.json({ success: true });
}

export function deleteQuote(req, res) {
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
  if (!quote) return res.status(404).json({ error: 'Devis introuvable.' });
  if (!canAccessQuote(req.user, quote)) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }

  db.prepare('DELETE FROM quotes WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
}
