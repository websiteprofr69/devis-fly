// frontend/assets/app.js
const API = window.DEVISPRO_API;
let currentSource = 'ai';
let currentRegion = 'Île-de-France';
let promptUsed = '';

QuoteEditor.configure({ tbodyId: 'linesBody', totalsIds: { ht: 'totalHT', tva: 'totalTVA', ttc: 'totalTTC' } });

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.getElementById('tab-ai').classList.toggle('active', tab === 'ai');
  document.getElementById('tab-manual').classList.toggle('active', tab === 'manual');
  document.getElementById('panel-ai').style.display = tab === 'ai' ? 'block' : 'none';
  document.getElementById('panel-manual').style.display = tab === 'manual' ? 'block' : 'none';
  currentSource = tab;

  if (tab === 'manual' && QuoteEditor.lines.length === 0) {
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

    QuoteEditor.setLines(data.lines);
    currentRegion = data.region;

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
    QuoteEditor.render();
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

function renderLines() { QuoteEditor.render(); }
function addLine() { QuoteEditor.addLine(); document.getElementById('quoteEditor').style.display = 'block'; }
function removeLine(i) { QuoteEditor.removeLine(i); }
function updateLine(i, field, val) { QuoteEditor.updateLine(i, field, val); }
function recalcTotals() { QuoteEditor.updateTotals(); }

// ── Save Quote ────────────────────────────────────────────────────────────────
async function saveQuote() {
  if (QuoteEditor.lines.length === 0) return showToast('Ajoutez au moins une ligne.', 'error');

  const token = localStorage.getItem('dp_token');
  if (!token) {
    showToast('Connectez-vous pour enregistrer un devis.', 'error');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    return;
  }

  try {
    const res = await fetch(`${API}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        client_name: document.getElementById('clientName')?.value || null,
        client_email: document.getElementById('clientEmail')?.value || null,
        source: currentSource,
        region: document.getElementById('manualRegion')?.value || currentRegion,
        lines: QuoteEditor.lines,
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

async function saveAsTemplate() {
  if (QuoteEditor.lines.length === 0) return showToast('Ajoutez au moins une ligne.', 'error');
  const token = localStorage.getItem('dp_token');
  if (!token) return showToast('Connectez-vous pour enregistrer un modèle.', 'error');

  try {
    const res = await fetch(`${API}/auth/template`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        lines: QuoteEditor.lines,
        region: document.getElementById('manualRegion')?.value || currentRegion,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast('Modèle enregistré pour vos prochains devis', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadUserTemplate() {
  const token = localStorage.getItem('dp_token');
  if (!token) return;

  try {
    const res = await fetch(`${API}/auth/template`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!data?.lines?.length) return;

    const banner = document.getElementById('templateBanner');
    if (banner) {
      banner.style.display = 'flex';
      banner.dataset.loaded = '0';
      window._savedTemplate = data;
    }
  } catch { /* ignore */ }
}

function applyUserTemplate() {
  const data = window._savedTemplate;
  if (!data?.lines?.length) return;
  QuoteEditor.setLines(data.lines);
  if (data.region) {
    currentRegion = data.region;
    const sel = document.getElementById('manualRegion');
    if (sel) sel.value = data.region;
  }
  switchTab('manual');
  QuoteEditor.render();
  document.getElementById('quoteEditor').style.display = 'block';
  document.getElementById('templateBanner').style.display = 'none';
  showToast('Modèle chargé — modifiez les prix et enregistrez', 'success');
}

function resetQuote() {
  QuoteEditor.setLines([]);
  promptUsed = '';
  document.getElementById('quoteEditor').style.display = 'none';
  document.getElementById('aiSummary').style.display = 'none';
  document.getElementById('promptInput').value = '';
  QuoteEditor.updateTotals();
}

function printQuote() { window.print(); }

function fmt(n) { return QuoteEditor.fmt(n); }
function esc(str) { return QuoteEditor.esc(str); }

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

document.getElementById('promptInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) generateQuote();
});

(function initFromAccount() {
  const raw = localStorage.getItem('dp_load_template');
  if (raw) {
    localStorage.removeItem('dp_load_template');
    try {
      const data = JSON.parse(raw);
      if (data?.lines?.length) {
        QuoteEditor.setLines(data.lines);
        if (data.region) {
          currentRegion = data.region;
          const sel = document.getElementById('manualRegion');
          if (sel) sel.value = data.region;
        }
        switchTab('manual');
        QuoteEditor.render();
        document.getElementById('quoteEditor').style.display = 'block';
        showToast('Modèle chargé depuis votre espace', 'success');
        return;
      }
    } catch { /* ignore */ }
  }
  loadUserTemplate();
})();
