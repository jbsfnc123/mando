const STORAGE_KEY = 'predictor_history_v3';
const LOGIN_KEY = 'predictor_admin_login';
let history = [];
let lastPrediction = null;
let featureStats = null;

const el = id => document.getElementById(id);

function showToast(msg, type = 'info') {
  const t = el('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 2200);
}

function label(o) { return o === 'left' ? 'KIRI' : o === 'right' ? 'KANAN' : 'SERI'; }
function pct(p) { return Math.round((p || 0) * 100) + '%'; }
function parity(n) { return n % 2 === 0 ? 'E' : 'O'; }
function diffBucket(d) { return d === 0 ? '0' : d <= 2 ? '1-2' : d <= 4 ? '3-4' : d <= 6 ? '5-6' : '7-9'; }
function resultFrom(l, r) { return l > r ? 'left' : r > l ? 'right' : 'draw'; }

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    history = raw ? JSON.parse(raw) : [];
  } catch { history = []; }
}
function saveHistory() { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); }

function comboKey(l, r) { return `${l}-${r}`; }
function pairKey(entry) { return `${entry.left}-${entry.right}`; }

function contextKey(entry, prev, prev2) {
  const diff = Math.abs(entry.left - entry.right);
  const sign = entry.left === entry.right ? 'D' : entry.left > entry.right ? 'L' : 'R';
  const pair = `${parity(entry.left)}${parity(entry.right)}`;
  const prevRes = prev ? prev.result : 'none';
  const prev2Res = prev2 ? prev2.result : 'none';
  const diffTrend = !prev ? 'na' : diff === Math.abs(prev.left - prev.right) ? 'flat' : diff > Math.abs(prev.left - prev.right) ? 'up' : 'down';
  return [pair, diffBucket(diff), sign, prevRes, prev2Res, diffTrend].join('|');
}

function detectRunType(seq) {
  if (seq.length < 2) return 'none';
  const last = seq[seq.length - 1];
  const prev = seq[seq.length - 2];
  if (last === prev) {
    let len = 2;
    for (let i = seq.length - 3; i >= 0; i--) {
      if (seq[i] === last) len++; else break;
    }
    return `streak:${last}:${len}`;
  }
  let alternating = true;
  for (let i = seq.length - 1; i >= Math.max(1, seq.length - 5); i--) {
    if (seq[i] === seq[i - 1]) { alternating = false; break; }
  }
  if (alternating) return `alternate:${prev}->${last}`;
  return 'mixed';
}

function buildFeatureStats() {
  const stats = {
    comboNext: {},
    contextNext: {},
    missPenalty: {},
    runNext: {},
    nextAfterResult: {},
    overall: { left: 0, right: 0, draw: 0 }
  };
  history.forEach(h => stats.overall[h.result]++);
  for (let i = 0; i < history.length - 1; i++) {
    const curr = history[i];
    const next = history[i + 1].result;
    const prev = i > 0 ? history[i - 1] : null;
    const prev2 = i > 1 ? history[i - 2] : null;
    const ck = comboKey(curr.left, curr.right);
    const xk = contextKey(curr, prev, prev2);
    const rk = detectRunType(history.slice(0, i + 1).map(r => r.result));
    const nk = curr.result;
    for (const [store, key] of [[stats.comboNext, ck], [stats.contextNext, xk], [stats.runNext, rk], [stats.nextAfterResult, nk]]) {
      store[key] ||= { left: 0, right: 0, draw: 0, total: 0 };
      store[key][next]++;
      store[key].total++;
    }
    if (curr.prediction && curr.prediction !== '—' && curr.prediction !== curr.result) {
      stats.missPenalty[xk] ||= { left: 0, right: 0, draw: 0, total: 0 };
      stats.missPenalty[xk][curr.prediction]++;
      stats.missPenalty[xk].total++;
    }
  }
  return stats;
}

function applyWeightedVotes(votes, source, weight, reasons, text, minTotal = 1) {
  if (!source || source.total < minTotal) return;
  ['left','right','draw'].forEach(k => votes[k] += weight * (source[k] / source.total));
  const top = ['left','right','draw'].sort((a,b)=>source[b]-source[a])[0];
  reasons.push(`${text} → ${label(top)} (${pct(source[top]/source.total)})`);
}

function predict() {
  if (history.length < 3) return null;
  featureStats = buildFeatureStats();
  const curr = history[history.length - 1];
  const prev = history[history.length - 2] || null;
  const prev2 = history[history.length - 3] || null;
  const votes = { left: 0, right: 0, draw: 0 };
  const reasons = [];

  const ck = comboKey(curr.left, curr.right);
  const xk = contextKey(curr, prev, prev2);
  const rk = detectRunType(history.map(r => r.result));
  const nk = curr.result;

  applyWeightedVotes(votes, featureStats.comboNext[ck], 3.8, reasons, `Kombinasi ${ck}`, 2);
  applyWeightedVotes(votes, featureStats.contextNext[xk], 3.2, reasons, `Konteks angka/pola`, 2);
  applyWeightedVotes(votes, featureStats.runNext[rk], 2.6, reasons, `Pola run`, 2);
  applyWeightedVotes(votes, featureStats.nextAfterResult[nk], 1.7, reasons, `Lanjutan hasil ${label(nk)}`, 2);

  const seq = history.map(r => r.result);
  const streakType = detectRunType(seq);
  if (streakType.startsWith('streak:')) {
    const [, outcome, lenStr] = streakType.split(':');
    const len = Number(lenStr);
    if (len >= 3) {
      if (outcome === 'left') votes.right += 1.15;
      else if (outcome === 'right') votes.left += 1.15;
      else votes.draw += .8;
      reasons.push(`Kemenangan beruntun ${len}x → potensi patah pola`);
    } else {
      votes[outcome] += .9;
      reasons.push(`Streak ${len}x → potensi lanjut`);
    }
  } else if (streakType.startsWith('alternate:')) {
    const [, chain] = streakType.split(':');
    const [a,b] = chain.split('->');
    votes[a] += 1.1;
    reasons.push(`Selang-seling ${label(a)} ↔ ${label(b)} → condong balik ke ${label(a)}`);
  }

  const penalty = featureStats.missPenalty[xk];
  if (penalty && penalty.total >= 2) {
    ['left','right','draw'].forEach(k => votes[k] -= 1.5 * (penalty[k] / penalty.total));
    reasons.push('Koreksi dari konteks prediksi yang sering meleset');
  }

  const totalOverall = Object.values(featureStats.overall).reduce((a,b)=>a+b,0) || 1;
  ['left','right','draw'].forEach(k => votes[k] += 0.5 * (featureStats.overall[k] / totalOverall));

  const entries = Object.entries(votes).sort((a,b)=>b[1]-a[1]);
  const sum = Math.max(0.001, entries.reduce((s,[,v])=>s+Math.max(0,v),0));
  const winner = entries[0][0];
  const conf = Math.max(0.35, Math.min(0.95, Math.max(0, entries[0][1]) / sum));
  return { outcome: winner, confidence: conf, reasons: reasons.slice(0,4) };
}

function updatePrediction() {
  const pred = predict();
  lastPrediction = pred;
  const banner = el('predBanner');
  const predText = el('predText');
  const predReason = el('predReason');
  const predConf = el('predConf');
  banner.className = 'prediction-banner';
  if (!pred) {
    banner.classList.add('pred-none');
    predText.className = 'pred-main none';
    predText.textContent = '— Menganalisis...';
    predReason.textContent = `Butuh minimal 3 ronde. Sudah ada ${history.length}.`;
    predConf.textContent = '—';
    return;
  }
  banner.classList.add('pred-' + pred.outcome);
  predText.className = 'pred-main ' + pred.outcome;
  predText.textContent = '▶ ' + label(pred.outcome);
  predReason.textContent = pred.reasons.join(' · ');
  predConf.textContent = pct(pred.confidence);
}

function updateStats() {
  const leftW = history.filter(r => r.result === 'left').length;
  const rightW = history.filter(r => r.result === 'right').length;
  const drawW = history.filter(r => r.result === 'draw').length;
  const total = history.length;
  el('statLeft').textContent = leftW;
  el('statRight').textContent = rightW;
  el('statDraw').textContent = drawW;
  const withPred = history.filter(r => r.prediction && r.prediction !== '—');
  el('statAcc').textContent = withPred.length ? pct(withPred.filter(r => r.prediction === r.result).length / withPred.length) : '—';
  const lp = total ? (leftW / total * 100).toFixed(1) : 0;
  const rp = total ? (rightW / total * 100).toFixed(1) : 0;
  const dp = total ? (drawW / total * 100).toFixed(1) : 0;
  el('barLeft').style.width = lp + '%';
  el('barRight').style.width = rp + '%';
  el('barDraw').style.width = dp + '%';
  el('labelLeft').textContent = `KIRI ${lp}%`;
  el('labelRight').textContent = `KANAN ${rp}%`;
  el('labelDraw').textContent = `SERI ${dp}%`;
}

function updateTable() {
  const tbody = el('histTbody');
  const empty = el('emptyMsg');
  const table = el('histTable');
  if (!history.length) { empty.style.display = 'block'; table.style.display = 'none'; return; }
  empty.style.display = 'none'; table.style.display = 'table'; tbody.innerHTML = '';
  [...history].reverse().forEach((row, idx) => {
    const tr = document.createElement('tr');
    const resultTag = `<span class="tag ${row.result}">${label(row.result)}</span>`;
    const predTag = row.prediction && row.prediction !== '—' ? `<span class="tag ${row.prediction}">${label(row.prediction)}</span>` : `<span style="color:var(--dim)">—</span>`;
    const correct = row.prediction && row.prediction !== '—' ? (row.prediction === row.result ? '✓' : '✗') : '';
    tr.innerHTML = `<td style="color:var(--dim)">${history.length - idx}</td><td style="color:var(--blue);font-family:'Orbitron',sans-serif;font-weight:700">${row.left}</td><td style="color:var(--red);font-family:'Orbitron',sans-serif;font-weight:700">${row.right}</td><td>${resultTag}</td><td>${predTag}</td><td>${correct}</td>`;
    tbody.appendChild(tr);
  });
}

function buildWinnerColumns(results) {
  if (!results.length) return [];
  const cols = [];
  let current = { winner: results[0], items: [results[0]] };
  for (let i = 1; i < results.length; i++) {
    if (results[i] === current.winner) current.items.push(results[i]);
    else { cols.push(current); current = { winner: results[i], items: [results[i]] }; }
  }
  cols.push(current);
  return cols.slice(-20);
}

function updateWinnerViz() {
  const grid = el('winnerGrid');
  grid.innerHTML = '';
  const cols = buildWinnerColumns(history.map(r => r.result));
  cols.forEach(col => {
    const c = document.createElement('div');
    c.className = 'winner-col';
    for (let i = 0; i < 20; i++) {
      const cell = document.createElement('div');
      if (i < col.items.length && i < 20) {
        cell.className = `winner-cell ${col.winner}`;
        cell.textContent = col.winner === 'left' ? 'L' : col.winner === 'right' ? 'R' : 'D';
      } else {
        cell.className = 'winner-empty';
      }
      c.appendChild(cell);
    }
    grid.appendChild(c);
  });
}

function refreshAll() { updateStats(); updatePrediction(); updateTable(); updateWinnerViz(); }

function addRound(l, r) {
  const result = resultFrom(l, r);
  const prediction = lastPrediction ? lastPrediction.outcome : '—';
  history.push({ left: l, right: r, result, prediction, ts: Date.now() });
  saveHistory();
  if (prediction !== '—') showToast(prediction === result ? '✓ Prediksi Tepat!' : '✗ Prediksi Meleset', prediction === result ? 'win' : 'info');
  refreshAll();
}

function parseImportText(text) {
  const rows = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const parsed = [];
  for (const row of rows) {
    if (/kiri|kanan|hasil|prediksi/i.test(row)) continue;
    const m = row.match(/(\d)\D+(\d)/);
    if (!m) continue;
    parsed.push([Number(m[1]), Number(m[2])]);
  }
  return parsed;
}

function setupEvents() {
  el('submitBtn').addEventListener('click', () => {
    const lv = el('inputLeft').value.trim(), rv = el('inputRight').value.trim();
    if (lv === '' || rv === '') return showToast('Isi kedua angka terlebih dahulu!', 'info');
    const l = parseInt(lv,10), r = parseInt(rv,10);
    if ([l,r].some(n => Number.isNaN(n) || n < 0 || n > 9)) return showToast('Angka harus antara 0 dan 9!', 'info');
    el('dispLeft').textContent = l; el('dispRight').textContent = r;
    el('inputLeft').value = ''; el('inputRight').value = ''; el('inputLeft').focus();
    addRound(l, r);
  });
  ['inputLeft','inputRight'].forEach(id => {
    el(id).addEventListener('input', e => el(id === 'inputLeft' ? 'dispLeft' : 'dispRight').textContent = e.target.value || '–');
    el(id).addEventListener('keydown', e => { if (e.key === 'Enter') el('submitBtn').click(); });
  });
  el('btnExport').addEventListener('click', () => {
    if (!history.length) return showToast('Tidak ada data untuk di-export.', 'info');
    const header = ['Ronde','Kiri','Kanan','Hasil','Prediksi','Tepat','Timestamp'];
    const rows = history.map((r,i)=>[i+1,r.left,r.right,label(r.result),r.prediction && r.prediction !== '—' ? label(r.prediction) : '',r.prediction && r.prediction !== '—' ? (r.prediction === r.result ? 'Ya' : 'Tidak') : '',new Date(r.ts).toLocaleString('id-ID')]);
    const csv = [header,...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `predictor_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url); showToast('CSV berhasil di-export!', 'win');
  });
  el('btnClear').addEventListener('click', () => {
    if (!confirm('Reset semua riwayat?')) return;
    history = []; saveHistory(); lastPrediction = null; el('dispLeft').textContent = '–'; el('dispRight').textContent = '–'; refreshAll(); showToast('Data berhasil direset.', 'info');
  });
  el('importFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const items = parseImportText(text);
    if (!items.length) return showToast('Format file tidak dikenali.', 'info');
    items.forEach(([l,r]) => addRound(l,r));
    showToast(`${items.length} ronde berhasil di-import`, 'win');
    e.target.value = '';
  });
  el('btnLogout').addEventListener('click', () => { localStorage.removeItem(LOGIN_KEY); location.reload(); });
}

function setupLogin() {
  const logged = localStorage.getItem(LOGIN_KEY) === '1';
  if (logged) { el('loginOverlay').classList.add('hidden'); el('appRoot').classList.remove('hidden'); return; }
  const doLogin = () => {
    const username = el('loginUser').value.trim();
    const password = el('loginPass').value;
    const ok = (window.APP_USERS || []).some(u => u.username === username && u.password === password);
    if (!ok) { el('loginError').textContent = 'Username atau password salah.'; return; }
    localStorage.setItem(LOGIN_KEY, '1');
    el('loginOverlay').classList.add('hidden');
    el('appRoot').classList.remove('hidden');
    el('loginError').textContent = '';
  };
  el('loginBtn').addEventListener('click', doLogin);
  el('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
}

loadHistory();
setupLogin();
setupEvents();
refreshAll();
