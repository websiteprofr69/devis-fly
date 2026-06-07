// backend/src/controllers/aiController.js
import Anthropic from '@anthropic-ai/sdk';
import db from '../config/database.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3001',
  }
});

/**
 * POST /api/ai/generate
 * Accepts a natural language prompt and returns structured quote lines
 */
export async function generateFromPrompt(req, res, next) {
  try {
    const { prompt } = req.body;
    if (!prompt || prompt.trim().length < 10) {
      return res.status(400).json({ error: 'Prompt trop court. Décrivez votre demande de devis.' });
    }

    // ── Step 1: Extract structured data from LLM ─────────────────────────────
    const extractionResponse = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `Tu es un assistant expert en bâtiment et toiture. Ton rôle est d'extraire des informations structurées d'une demande de devis en français.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après.
Le JSON doit respecter strictement ce schéma :
{
  "travaux_type": string (ex: "Toiture", "Isolation", "Toiture + Isolation"),
  "surface_m2": number | null,
  "region": string | null (normalise vers: "Île-de-France", "Rhône-Alpes", "PACA", "Bretagne", "Occitanie", ou null si inconnue),
  "prestations": array of strings (liste des travaux détectés parmi: "Dépose toiture", "Pose charpente", "Remontage tuiles", "Isolation", "Évacuation gravats", "Étanchéité"),
  "client_name": string | null,
  "notes": string | null (informations complémentaires)
}`,
      messages: [{ role: 'user', content: `Demande de devis: "${prompt}"` }],
    });

    const rawText = extractionResponse.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    let extracted;
    try {
      extracted = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch {
      return res.status(422).json({ error: "L'IA n'a pas pu analyser votre demande. Reformulez en précisant les travaux, la surface et la région." });
    }

    // ── Step 2: Fetch matching prices from DB ────────────────────────────────
    const region = extracted.region || 'Île-de-France';
    const surface = extracted.surface_m2 || 100;
    const prestations = extracted.prestations || [];

    if (prestations.length === 0) {
      return res.status(422).json({ error: "Aucune prestation détectée. Précisez les travaux souhaités (ex: pose de toiture, isolation)." });
    }

    const lines = [];
    for (const prestation of prestations) {
      const pricing = db
        .prepare('SELECT * FROM pricing_grid WHERE region = ? AND prestationType = ?')
        .get(region, prestation);

      if (!pricing) {
        // Fallback: try any region
        const fallback = db.prepare('SELECT * FROM pricing_grid WHERE prestationType = ?').get(prestation);
        if (!fallback) continue;
        const qty = fallback.unit === 'forfait' ? 1 : surface;
        const totalHt = +(qty * fallback.price_ht).toFixed(2);
        lines.push({
          designation: prestation,
          unit: fallback.unit,
          qty,
          price_ht: fallback.price_ht,
          tva_rate: fallback.tva_rate,
          total_ht: totalHt,
          total_ttc: +(totalHt * (1 + fallback.tva_rate)).toFixed(2),
          editable: true,
        });
        continue;
      }

      const qty = pricing.unit === 'forfait' ? 1 : surface;
      const totalHt = +(qty * pricing.price_ht).toFixed(2);
      lines.push({
        designation: prestation,
        unit: pricing.unit,
        qty,
        price_ht: pricing.price_ht,
        tva_rate: pricing.tva_rate,
        total_ht: totalHt,
        total_ttc: +(totalHt * (1 + pricing.tva_rate)).toFixed(2),
        editable: true,
      });
    }

    const totalHt = +lines.reduce((s, l) => s + l.total_ht, 0).toFixed(2);
    const totalTtc = +lines.reduce((s, l) => s + l.total_ttc, 0).toFixed(2);

    return res.json({
      success: true,
      extracted,
      region,
      surface_m2: surface,
      lines,
      totals: { total_ht: totalHt, total_ttc: totalTtc, tva: +(totalTtc - totalHt).toFixed(2) },
    });
  } catch (err) {
    next(err);
  }
}
