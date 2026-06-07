// backend/src/controllers/aiController.js
import db from '../config/database.js';

const AI_MODEL = process.env.AI_MODEL || 'anthropic/claude-sonnet-4';

const SYSTEM_PROMPT = `Tu es un assistant expert en bâtiment et toiture. Ton rôle est d'extraire des informations structurées d'une demande de devis en français.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après.
Le JSON doit respecter strictement ce schéma :
{
  "travaux_type": string (ex: "Toiture", "Isolation", "Toiture + Isolation"),
  "surface_m2": number | null,
  "region": string | null (normalise vers: "Île-de-France", "Rhône-Alpes", "PACA", "Bretagne", "Occitanie", ou null si inconnue),
  "prestations": array of strings (liste des travaux détectés parmi: "Dépose toiture", "Pose charpente", "Remontage tuiles", "Isolation", "Évacuation gravats", "Étanchéité"),
  "client_name": string | null,
  "notes": string | null (informations complémentaires)
}`;

async function callOpenRouter(prompt) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'https://devis.fly.dev',
      'X-Title': 'DevisPro',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Demande de devis: "${prompt}"` },
      ],
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errMsg = data?.error?.message || data?.error?.code || `OpenRouter HTTP ${res.status}`;
    throw new Error(String(errMsg));
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Réponse IA vide');
  return content;
}

/**
 * POST /api/ai/generate
 */
export async function generateFromPrompt(req, res) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'Clé API IA non configurée. Ajoutez ANTHROPIC_API_KEY sur Fly.io.' });
    }

    const { prompt } = req.body;
    if (!prompt || prompt.trim().length < 10) {
      return res.status(400).json({ error: 'Prompt trop court. Décrivez votre demande de devis.' });
    }

    const rawText = await callOpenRouter(prompt.trim());

    let extracted;
    try {
      extracted = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch {
      return res.status(422).json({ error: "L'IA n'a pas pu analyser votre demande. Reformulez en précisant les travaux, la surface et la région." });
    }

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
    console.error('[AI]', err.message);
    const msg = String(err.message || '');
    if (msg.includes('401') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid')) {
      return res.status(502).json({ error: 'Clé API OpenRouter invalide. Vérifiez ANTHROPIC_API_KEY sur Fly.io.' });
    }
    if (msg.includes('402') || msg.toLowerCase().includes('credit')) {
      return res.status(502).json({ error: 'Crédits OpenRouter insuffisants. Rechargez sur openrouter.ai.' });
    }
    return res.status(502).json({ error: `Erreur IA : ${msg}` });
  }
}
