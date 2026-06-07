// Éditeur de lignes de devis (partagé index + account)
window.QuoteEditor = {
  lines: [],
  tbodyId: 'linesBody',
  totalsIds: { ht: 'totalHT', tva: 'totalTVA', ttc: 'totalTTC' },

  configure({ tbodyId, totalsIds }) {
    if (tbodyId) this.tbodyId = tbodyId;
    if (totalsIds) this.totalsIds = totalsIds;
  },

  setLines(lines) {
    this.lines = (lines || []).map((l) => ({
      designation: l.designation || '',
      unit: l.unit || 'm2',
      qty: l.qty ?? 1,
      price_ht: l.price_ht ?? 0,
      tva_rate: l.tva_rate ?? 0.10,
      total_ht: l.total_ht ?? 0,
      total_ttc: l.total_ttc ?? 0,
      editable: true,
    }));
    this.lines.forEach((_, i) => this.recalcLine(i));
  },

  recalcLine(i) {
    const l = this.lines[i];
    l.total_ht = +(l.qty * l.price_ht).toFixed(2);
    l.total_ttc = +(l.total_ht * (1 + l.tva_rate)).toFixed(2);
  },

  getTotals() {
    const ht = +this.lines.reduce((s, l) => s + l.total_ht, 0).toFixed(2);
    const ttc = +this.lines.reduce((s, l) => s + l.total_ttc, 0).toFixed(2);
    return { ht, ttc, tva: +(ttc - ht).toFixed(2) };
  },

  render() {
    const tbody = document.getElementById(this.tbodyId);
    if (!tbody) return;

    tbody.innerHTML = this.lines.map((line, i) => `
      <tr>
        <td><input class="input-field" style="min-width:180px;" value="${this.esc(line.designation)}" onchange="QuoteEditor.updateLine(${i},'designation',this.value)" /></td>
        <td>
          <select class="input-field" onchange="QuoteEditor.updateLine(${i},'unit',this.value)">
            ${['m2','ml','h','forfait','u'].map((u) => `<option ${line.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
          </select>
        </td>
        <td><input class="input-field" type="number" min="0" step="0.01" value="${line.qty}" onchange="QuoteEditor.updateLine(${i},'qty',+this.value)" /></td>
        <td><input class="input-field" type="number" min="0" step="0.01" value="${line.price_ht}" onchange="QuoteEditor.updateLine(${i},'price_ht',+this.value)" /></td>
        <td>
          <select class="input-field" onchange="QuoteEditor.updateLine(${i},'tva_rate',+this.value)">
            <option value="0.10" ${line.tva_rate === 0.10 ? 'selected' : ''}>10%</option>
            <option value="0.20" ${line.tva_rate === 0.20 ? 'selected' : ''}>20%</option>
            <option value="0.055" ${line.tva_rate === 0.055 ? 'selected' : ''}>5.5%</option>
          </select>
        </td>
        <td id="line-ttc-${i}" style="font-weight:600;font-family:'Syne',sans-serif;">${this.fmt(line.total_ttc)} €</td>
        <td>
          <button class="btn-ghost" type="button" onclick="QuoteEditor.removeLine(${i})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </td>
      </tr>
    `).join('');

    this.updateTotals();
  },

  updateTotals() {
    const { ht, ttc, tva } = this.getTotals();
    const ids = this.totalsIds;
    if (ids.ht) document.getElementById(ids.ht).textContent = `${this.fmt(ht)} €`;
    if (ids.tva) document.getElementById(ids.tva).textContent = `${this.fmt(tva)} €`;
    if (ids.ttc) document.getElementById(ids.ttc).textContent = `${this.fmt(ttc)} €`;
  },

  updateLine(i, field, val) {
    this.lines[i][field] = val;
    this.recalcLine(i);
    const cell = document.getElementById(`line-ttc-${i}`);
    if (cell) cell.textContent = `${this.fmt(this.lines[i].total_ttc)} €`;
    this.updateTotals();
  },

  addLine() {
    this.lines.push({
      designation: 'Nouvelle prestation', unit: 'm2', qty: 1, price_ht: 0,
      tva_rate: 0.10, total_ht: 0, total_ttc: 0, editable: true,
    });
    this.recalcLine(this.lines.length - 1);
    this.render();
  },

  removeLine(i) {
    this.lines.splice(i, 1);
    this.render();
  },

  fmt(n) {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
  },

  esc(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  },
};
