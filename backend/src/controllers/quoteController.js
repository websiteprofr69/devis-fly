// backend/src/controllers/quoteController.js
import db from '../config/database.js';

export function saveQuote(req, res) {
  const { client_name, client_email, source, region, lines, prompt_used } = req.body;
  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'Le devis doit contenir au moins une ligne.' });
  }

  const total_ht = +lines.reduce((s, l) => s + (l.total_ht || 0), 0).toFixed(2);
  const total_ttc = +lines.reduce((s, l) => s + (l.total_ttc || 0), 0).toFixed(2);

  const result = db.prepare(`
    INSERT INTO quotes (client_name, client_email, source, region, total_ht, total_ttc, lines_json, prompt_used)
    VALUES (@client_name, @client_email, @source, @region, @total_ht, @total_ttc, @lines_json, @prompt_used)
  `).run({
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
  const { search, source, limit = 50, offset = 0 } = req.query;
  let query = 'SELECT id, client_name, client_email, source, status, region, total_ht, total_ttc, created_at FROM quotes WHERE 1=1';
  const params = [];

  if (search) { query += ' AND (client_name LIKE ? OR client_email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (source) { query += ' AND source = ?'; params.push(source); }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const quotes = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as c FROM quotes').get().c;
  return res.json({ quotes, total });
}

export function getQuote(req, res) {
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
  if (!quote) return res.status(404).json({ error: 'Devis introuvable.' });
  quote.lines = JSON.parse(quote.lines_json);
  delete quote.lines_json;
  return res.json(quote);
}

export function updateQuoteStatus(req, res) {
  const { status } = req.body;
  const valid = ['draft', 'sent', 'accepted', 'rejected'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Statut invalide.' });
  db.prepare('UPDATE quotes SET status = ?, updated_at = datetime("now") WHERE id = ?').run(status, req.params.id);
  return res.json({ success: true });
}

export function deleteQuote(req, res) {
  db.prepare('DELETE FROM quotes WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
}
