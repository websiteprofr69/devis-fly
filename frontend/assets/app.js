// frontend/assets/app.js
const API = window.DEVISPRO_API;
let currentLines = [];
let currentSource = 'ai';
let currentRegion = 'Île-de-France';
let promptUsed = '';

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.getElementById('tab-ai').classList.toggle('active', tab === 'ai');
  document.getElementById('tab-manual').classList.toggle('active', tab === 'manual');
  document.getElementById('panel-ai').style.display = tab === 'ai' ? 'block' : 'none';
  document.getElementById('panel-manual').style.display = tab === 'manual' ? 'block' : 'none';
  currentSource = tab;

  if (tab === 'manual' && currentLines.length === 0) {
    addLine();
    document.getElementById('quoteEditor').style.display = 'block';
  }
}

function setPrompt(text) {
  document.getElementById('promptInput').value = text;
  document.getElementById('promptInput').focus();
}

// ── AI Generation ─────────────────────────────────────────────────────────────
async function generateQuote() {
  const prompt = document.getElementById('promptInput').value.trim();
  if (!prompt) return showToast('Veuillez saisir une description.', 'error');

  promptUsed = prompt;
  const btn = document.getElementById('generateBtn');
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner"></div> Analyse en cours…`;

  document.getElementById('aiLoading').style.display = 'block';
  document.getElementById('aiSummary').style.display = 'none';
  document.getElementById('quoteEditor').style.display = 'none';

  try {
    const res = await fetch(`${API}/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');

    currentLines = data.lines;
    currentRegion = data.region;

    // Show summary card
    const s = document.getElementById('aiSummary');
    s.innerHTML = `
      <div style="padding:20px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          <span style="font-family:'Syne',sans-serif;font-weight:700;font-size:14px;">Projet détecté</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 16px;">
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em;">Type</div>
            <div style="font-weight:600;font-size:14px;">${data.extracted.travaux_type}</div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 16px;">
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em;">Surface</div>
            <div style="font-weight:600;font-size:14px;">${data.surface_m2} m²</div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 16px;">
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em;">Région</div>
            <div style="font-weight:600;font-size:14px;">${data.region}</div>
          </div>
          <div style="background:var(--accent-dim);border:1px solid rgba(249,115,22,0.3);border-radius:8px;padding:10px 16px;">
            <div style="font-size:11px;color:var(--accent);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em;">Total TTC</div>
            <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:18px;color:var(--accent);">${fmt(data.totals.total_ttc)} €</div>
          </div>
        </div>
        ${data.extracted.notes ? `<p style="margin-top:12px;font-size:13px;color:var(--muted);">📝 ${data.extracted.notes}</p>` : ''}
      </div>`;
    s.style.display = 'block';
    renderLines();
    document.getElementById('quoteEditor').style.display = 'block';
    showToast(`${data.lines.length} prestation(s) générée(s)`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    document.getElementById('aiLoading').style.display = 'none';
    btn.disabled = false;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Générer le devis`;
  }
}

// ── Lines Renderer ────────────────────────────────────────────────────────────
function renderLines() {
  const tbody = document.getElementById('linesBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  currentLines.forEach((line, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="input-field" style="min-width:180px;" value="${esc(line.designation)}" onchange="updateLine(${i},'designation',this.value)" /></td>
      <td>
        <select class="input-field" onchange="updateLine(${i},'unit',this.value)">
          ${['m2','ml','h','forfait','u'].map(u => `<option ${line.unit===u?'selected':''}>${u}</option>`).join('')}
        </select>
      </td>
      <td><input class="input-field" type="number" min="0" step="0.01" value="${line.qty}" onchange="updateLine(${i},'qty',+this.value)" /></td>
      <td><input class="input-field" type="number" min="0" step="0.01" value="${line.price_ht}" onchange="updateLine(${i},'price_ht',+this.value)" /></td>
      <td>
        <select class="input-field" onchange="updateLine(${i},'tva_rate',+this.value)">
          <option value="0.10" ${line.tva_rate===0.10?'selected':''}>10%</option>
          <option value="0.20" ${line.tva_rate===0.20?'selected':''}>20%</option>
          <option value="0.055" ${line.tva_rate===0.055?'selected':''}>5.5%</option>
        </select>
      </td>
      <td style="font-weight:600;font-family:'Syne',sans-serif;color:var(--text);">${fmt(line.total_ttc)} €</td>
      <td>
        <button class="btn-ghost" title="Supprimer" onclick="removeLine(${i})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
      </td>`;
    tbody.appendChild(tr);
  });
  recalcTotals();
}

function updateLine(i, field, val) {
  currentLines[i][field] = val;
  const l = currentLines[i];
  l.total_ht = +(l.qty * l.price_ht).toFixed(2);
  l.total_ttc = +(l.total_ht * (1 + l.tva_rate)).toFixed(2);
  // Update TTC cell without full re-render (performance)
  const rows = document.getElementById('linesBody').rows;
  if (rows[i]) rows[i].cells[5].textContent = `${fmt(l.total_ttc)} €`;
  recalcTotals();
}

function addLine() {
  currentLines.push({ designation: 'Nouvelle prestation', unit: 'm2', qty: 1, price_ht: 0, tva_rate: 0.10, total_ht: 0, total_ttc: 0, editable: true });
  renderLines();
  document.getElementById('quoteEditor').style.display = 'block';
}

function removeLine(i) {
  currentLines.splice(i, 1);
  renderLines();
}

function recalcTotals() {
  const ht = +currentLines.reduce((s, l) => s + l.total_ht, 0).toFixed(2);
  const ttc = +currentLines.reduce((s, l) => s + l.total_ttc, 0).toFixed(2);
  const tva = +(ttc - ht).toFixed(2);
  document.getElementById('totalHT').textContent = `${fmt(ht)} €`;
  document.getElementById('totalTVA').textContent = `${fmt(tva)} €`;
  document.getElementById('totalTTC').textContent = `${fmt(ttc)} €`;
}

// ── Save Quote ────────────────────────────────────────────────────────────────
async function saveQuote() {
  if (currentLines.length === 0) return showToast('Ajoutez au moins une ligne.', 'error');
  try {
    const res = await fetch(`${API}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: document.getElementById('clientName')?.value || null,
        client_email: document.getElementById('clientEmail')?.value || null,
        source: currentSource,
        region: currentRegion,
        lines: currentLines,
        prompt_used: promptUsed,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast(`Devis #${data.id} enregistré — Total TTC: ${fmt(data.total_ttc)} €`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function resetQuote() {
  currentLines = [];
  promptUsed = '';
  document.getElementById('quoteEditor').style.display = 'none';
  document.getElementById('aiSummary').style.display = 'none';
  document.getElementById('promptInput').value = '';
  recalcTotals();
}

function printQuote() {
  window.print();
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function esc(str) { return (str || '').replace(/"/g, '&quot;'); }

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  const icon = document.getElementById('toastIcon');
  const msgEl = document.getElementById('toastMsg');
  t.className = `show ${type}`;
  icon.innerHTML = type === 'success'
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  msgEl.textContent = msg;
  setTimeout(() => { t.className = type; }, 3800);
}

// Allow Enter key to generate
document.getElementById('promptInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) generateQuote();
});
