// backend/src/controllers/pricingController.js
import db from '../config/database.js';

export function getPricingGrid(req, res) {
  const { region } = req.query;
  let rows;
  if (region) {
    rows = db.prepare('SELECT * FROM pricing_grid WHERE region = ? ORDER BY prestationType').all(region);
  } else {
    rows = db.prepare('SELECT * FROM pricing_grid ORDER BY region, prestationType').all();
  }
  return res.json(rows);
}

export function updatePricingRow(req, res) {
  const { id } = req.params;
  const { price_ht, tva_rate, unit } = req.body;

  if (price_ht == null || isNaN(price_ht) || price_ht < 0) {
    return res.status(400).json({ error: 'Prix HT invalide.' });
  }

  db.prepare(`
    UPDATE pricing_grid SET price_ht = ?, tva_rate = ?, unit = ?, updated_at = datetime('now') WHERE id = ?
  `).run(Number(price_ht), Number(tva_rate) || 0.10, unit || 'm2', id);

  return res.json({ success: true });
}

export function createPricingRow(req, res) {
  const { region, prestationType, unit, price_ht, tva_rate } = req.body;
  if (!region || !prestationType || price_ht == null) {
    return res.status(400).json({ error: 'Région, type de prestation et prix requis.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO pricing_grid (region, prestationType, unit, price_ht, tva_rate) VALUES (?, ?, ?, ?, ?)
    `).run(region, prestationType, unit || 'm2', Number(price_ht), Number(tva_rate) || 0.10);
    return res.status(201).json({ id: result.lastInsertRowid });
  } catch {
    return res.status(409).json({ error: 'Cette combinaison région / prestation existe déjà.' });
  }
}

export function deletePricingRow(req, res) {
  db.prepare('DELETE FROM pricing_grid WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
}

export function getRegions(req, res) {
  const rows = db.prepare('SELECT DISTINCT region FROM pricing_grid ORDER BY region').all();
  return res.json(rows.map((r) => r.region));
}
