const STORAGE_KEY = 'predictor_history_combo_v1';
const SESSION_KEY = 'predictor_admin_session_v1';

let history = [];
let pairOutcomeMap = [];
let lastPrediction = null;

function initPairOutcomeMap() {
  pairOutcomeMap = new Array(100);
  for (let i = 0; i < 100; i++) pairOutcomeMap[i] = { left: 0, right: 0, draw: 0, total: 0 };
}
function pairIndex(left, right) { return left * 10 + right; }
function pairLabel(left, right) { return `${left},${right}`; }
function label(o) { return o === 'left' ? 'KIRI' : o === 'right' ? 'KANAN' : 'SERI'; }
function pct(p) { return Math.round((p || 0) * 100) + '%'; }
function getOutcome(left, right) { return left > right ? 'left' : right > left ? 'right' : 'draw'; }

function showToast(msg, type='info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 2200);
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    history = raw ? JSON.parse(raw) : [];
  } catch (e) {
    history = [];
  }
}
function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function rebuildPairOutcomeMap() {
  initPairOutcomeMap();
  if (history.length < 2) return;
  for (let i = 0; i < history.length - 1; i++) {
    const current = history[i];
    const next = history[i + 1];
    const bucket = pairOutcomeMap[pairIndex(current.left, current.right)];
    bucket[next.result]++;
    bucket.total++;
  }
}

function getBucketWinner(bucket) {
  if (!bucket || bucket.total === 0) return null;
  const sorted = [['left', bucket.left], ['right', bucket.right], ['draw', bucket.draw]].sort((a, b) => b[1] - a[1]);
  return { outcome: sorted[0][0], count: sorted[0][1], confidence: sorted[0][1] / bucket.total };
}

function getNearestBuckets(left, right) {
  const found = [];
  for (let distance = 1; distance <= 18; distance++) {
    for (let l = 0; l <= 9; l++) {
      for (let r = 0; r <= 9; r++) {
        if (Math.abs(left - l) + Math.abs(right - r) !== distance) continue;
        const bucket = pairOutcomeMap[pairIndex(l, r)];
        if (bucket.total > 0) found.push({ left: l, right: r, distance, bucket });
      }
    }
    if (found.length) break;
  }
  return found;
}

function predict() {
  if (history.length < 2) return null;

  const last = history[history.length - 1];
  const exactBucket = pairOutcomeMap[pairIndex(last.left, last.right)];

  if (exactBucket.total > 0) {
    const winner = getBucketWinner(exactBucket);
    return {
      outcome: winner.outcome,
      confidence: Math.min(winner.confidence, 0.95),
      source: 'exact',
      sourcePair: { left: last.left, right: last.right },
      reason: `Exact ${pairLabel(last.left, last.right)} → ${label(winner.outcome)} dari ${winner.count}/${exactBucket.total} sampel`,
      displayRows: [
        { name: 'KIRI', value: exactBucket.left },
        { name: 'KANAN', value: exactBucket.right },
        { name: 'SERI', value: exactBucket.draw }
      ].sort((a, b) => b.value - a.value)
    };
  }

  const nearest = getNearestBuckets(last.left, last.right);
  if (!nearest.length) return null;

  const aggregate = { left: 0, right: 0, draw: 0 };
  nearest.forEach(item => {
    const weight = 1 / (item.distance + 1);
    aggregate.left += item.bucket.left * weight;
    aggregate.right += item.bucket.right * weight;
    aggregate.draw += item.bucket.draw * weight;
  });
  const weightedTotal = aggregate.left + aggregate.right + aggregate.draw;
  const sorted = [['left', aggregate.left], ['right', aggregate.right], ['draw', aggregate.draw]].sort((a, b) => b[1] - a[1]);

  return {
    outcome: sorted[0][0],
    confidence: Math.min(sorted[0][1] / Math.max(weightedTotal, 1), 0.9),
    source: 'nearest',
    sourcePair: { left: nearest[0].left, right: nearest[0].right, distance: nearest[0].distance },
    reason: `Fallback ke kombinasi terdekat, utama ${pairLabel(nearest[0].left, nearest[0].right)} dengan jarak ${nearest[0].distance}`,
    nearestList: nearest.slice(0, 5),
    displayRows: [
      { name: 'KIRI', value: aggregate.left },
      { name: 'KANAN', value: aggregate.right },
      { name: 'SERI', value: aggregate.draw }
    ].sort((a, b) => b.value - a.value)
  };
}

function updatePrediction() {
  const banner = document.getElementById('predBanner');
  const predText = document.getElementById('predText');
  const predReason = document.getElementById('predReason');
  const predConf = document.getElementById('predConf');

  lastPrediction = predict();
  banner.className = 'prediction-banner card';

  if (!lastPrediction) {
    banner.classList.add('pred-none');
    predText.className = 'pred-main none';
    predText.textContent = '— Menunggu Data';
    predReason.textContent = 'Butuh minimal 2 ronde agar pasangan angka bisa dikaitkan dengan hasil ronde berikutnya.';
    predConf.textContent = '—';
    return;
  }

  banner.classList.add('pred-' + lastPrediction.outcome);
  predText.className = 'pred-main ' + lastPrediction.outcome;
  predText.textContent = '▶ ' + label(lastPrediction.outcome);
  predReason.textContent = lastPrediction.reason;
  predConf.textContent = pct(lastPrediction.confidence);
}

function updateStats() {
  const leftW = history.filter(r => r.result === 'left').length;
  const rightW = history.filter(r => r.result === 'right').length;
  const drawW = history.filter(r => r.result === 'draw').length;
  const total = history.length;

  document.getElementById('statLeft').textContent = leftW;
  document.getElementById('statRight').textContent = rightW;
  document.getElementById('statDraw').textContent = drawW;

  const predicted = history.filter(r => r.prediction && r.prediction !== '—');
  document.getElementById('statAcc').textContent = predicted.length ? pct(predicted.filter(r => r.prediction === r.result).length / predicted.length) : '—';

  const lp = total ? (leftW / total * 100).toFixed(1) : '0.0';
  const rp = total ? (rightW / total * 100).toFixed(1) : '0.0';
  const dp = total ? (drawW / total * 100).toFixed(1) : '0.0';
  document.getElementById('barLeft').style.width = lp + '%';
  document.getElementById('barRight').style.width = rp + '%';
  document.getElementById('barDraw').style.width = dp + '%';
  document.getElementById('labelLeft').textContent = `KIRI ${lp}%`;
  document.getElementById('labelRight').textContent = `KANAN ${rp}%`;
  document.getElementById('labelDraw').textContent = `SERI ${dp}%`;
}

function updateTable() {
  const tbody = document.getElementById('histTbody');
  const empty = document.getElementById('emptyMsg');
  const table = document.getElementById('histTable');

  if (!history.length) {
    empty.style.display = 'block';
    table.style.display = 'none';
    tbody.innerHTML = '';
    return;
  }

  empty.style.display = 'none';
  table.style.display = 'table';
  tbody.innerHTML = '';

  [...history].reverse().forEach((row, idx) => {
    const tr = document.createElement('tr');
    const predTag = row.prediction && row.prediction !== '—'
      ? `<span class="tag ${row.prediction}">${label(row.prediction)}</span>`
      : `<span class="tag off">—</span>`;
    const resultTag = `<span class="tag ${row.result}">${label(row.result)}</span>`;
    const isCorrect = row.prediction && row.prediction !== '—' ? (row.prediction === row.result ? '✓' : '✗') : '';
    tr.innerHTML = `<td>${history.length - idx}</td><td class="blue" style="font-family:'Orbitron',sans-serif">${row.left}</td><td class="red" style="font-family:'Orbitron',sans-serif">${row.right}</td><td>${resultTag}</td><td>${predTag}</td><td>${isCorrect}</td>`;
    tbody.appendChild(tr);
  });
}

function buildRunColumns() {
  const cols = [];
  let current = null;
  history.forEach(row => {
    if (!current || current.result !== row.result) {
      current = { result: row.result, length: 1 };
      cols.push(current);
    } else current.length++;
  });
  return cols.slice(-20);
}
function updateBoard() {
  const grid = document.getElementById('boardGrid');
  grid.innerHTML = '';
  const width = 20, height = 20, cols = buildRunColumns();

  for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) {
    const cell = document.createElement('div');
    cell.className = 'board-cell';
    grid.appendChild(cell);
  }

  cols.forEach((col, idx) => {
    const x = width - cols.length + idx;
    const maxLen = Math.min(col.length, height);
    for (let y = 0; y < maxLen; y++) {
      const cell = grid.children[y * width + x];
      cell.classList.add(col.result);
      cell.textContent = col.result === 'left' ? 'L' : col.result === 'right' ? 'R' : 'D';
      cell.title = `${label(col.result)} × ${col.length}`;
    }
  });
}

function updateLookupInfo() {
  const pairEl = document.getElementById('lookupPair');
  const metaEl = document.getElementById('lookupMeta');
  const rankWrap = document.getElementById('lookupRankWrap');

  if (!history.length) {
    pairEl.textContent = 'Belum ada pasangan aktif.';
    metaEl.textContent = 'Masukkan data untuk membangun lookup kombinasi.';
    rankWrap.innerHTML = '<div class="info-muted">Belum ada data pasangan.</div>';
    return;
  }

  const last = history[history.length - 1];
  pairEl.textContent = pairLabel(last.left, last.right);

  const prediction = lastPrediction;
  if (!prediction) {
    metaEl.textContent = 'Belum cukup data untuk lookup pasangan.';
    rankWrap.innerHTML = '<div class="info-muted">Butuh minimal 2 ronde.</div>';
    return;
  }

  metaEl.textContent = prediction.reason;

  if (prediction.source === 'exact') {
    const rows = prediction.displayRows.map(row => `<tr><td>${row.name}</td><td>${Number(row.value).toFixed(0)}</td></tr>`).join('');
    rankWrap.innerHTML = `<table class="lookup-table"><thead><tr><th>Hasil</th><th>Jumlah</th></tr></thead><tbody>${rows}</tbody></table>`;
  } else {
    const rows = prediction.nearestList.map(item => `<tr><td>${pairLabel(item.left, item.right)}</td><td>${item.distance}</td><td>${item.bucket.total}</td></tr>`).join('');
    rankWrap.innerHTML = `<table class="lookup-table"><thead><tr><th>Pasangan</th><th>Jarak</th><th>Sampel</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
}

function refreshAll() {
  rebuildPairOutcomeMap();
  updatePrediction();
  updateStats();
  updateTable();
  updateBoard();
  updateLookupInfo();
}

function parseImportText(text) {
  const rows = [];
  text.split(/\r?\n/).forEach(line => {
    const clean = line.trim();
    if (!clean) return;
    const nums = clean.match(/\d+/g);
    if (!nums || nums.length < 2) return;
    const left = parseInt(nums[0], 10);
    const right = parseInt(nums[1], 10);
    if ([left, right].some(n => Number.isNaN(n) || n < 0 || n > 9)) return;
    rows.push({ left, right });
  });
  return rows;
}

function predictFromArray(arr) {
  const backupHistory = history;
  const backupMap = pairOutcomeMap;
  history = arr;
  rebuildPairOutcomeMap();
  const result = predict();
  history = backupHistory;
  pairOutcomeMap = backupMap;
  return result;
}

function rebuildPredictionsForAll() {
  for (let i = 0; i < history.length; i++) {
    if (i < 1) {
      history[i].prediction = '—';
      continue;
    }
    const prediction = predictFromArray(history.slice(0, i));
    history[i].prediction = prediction ? prediction.outcome : '—';
  }
}

document.getElementById('submitBtn').addEventListener('click', () => {
  const lv = document.getElementById('inputLeft').value.trim();
  const rv = document.getElementById('inputRight').value.trim();
  if (lv === '' || rv === '') return showToast('Isi kedua angka terlebih dahulu!', 'info');

  const left = parseInt(lv, 10);
  const right = parseInt(rv, 10);
  if ([left, right].some(n => Number.isNaN(n) || n < 0 || n > 9)) return showToast('Angka harus 0 sampai 9.', 'info');

  document.getElementById('dispLeft').textContent = left;
  document.getElementById('dispRight').textContent = right;

  const result = getOutcome(left, right);
  const prediction = lastPrediction ? lastPrediction.outcome : '—';

  history.push({ left, right, result, prediction, ts: Date.now() });
  saveHistory();
  refreshAll();

  if (prediction !== '—') showToast(prediction === result ? 'Prediksi Tepat!' : 'Prediksi Meleset', prediction === result ? 'win' : 'info');

  document.getElementById('inputLeft').value = '';
  document.getElementById('inputRight').value = '';
  document.getElementById('inputLeft').focus();
});

['inputLeft', 'inputRight'].forEach(id => {
  document.getElementById(id).addEventListener('input', e => {
    document.getElementById(id === 'inputLeft' ? 'dispLeft' : 'dispRight').textContent = e.target.value !== '' ? e.target.value : '–';
  });
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('submitBtn').click();
  });
});

document.getElementById('btnExport').addEventListener('click', () => {
  if (!history.length) return showToast('Tidak ada data untuk diexport.', 'info');
  const header = ['Ronde', 'Kiri', 'Kanan', 'Hasil', 'Prediksi', 'Tepat', 'Timestamp'];
  const rows = history.map((r, i) => [
    i + 1, r.left, r.right, label(r.result), r.prediction === '—' ? '' : label(r.prediction),
    r.prediction === '—' ? '' : (r.prediction === r.result ? 'Ya' : 'Tidak'),
    new Date(r.ts).toLocaleString('id-ID')
  ]);
  const csv = [header, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `predictor_combo_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV berhasil diexport.', 'win');
});

document.getElementById('btnClear').addEventListener('click', () => {
  if (!confirm('Reset semua riwayat?')) return;
  history = [];
  saveHistory();
  refreshAll();
  document.getElementById('dispLeft').textContent = '–';
  document.getElementById('dispRight').textContent = '–';
  showToast('Riwayat direset.', 'info');
});

document.getElementById('importFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const rows = parseImportText(text);
  if (!rows.length) return showToast('File tidak berisi format angka yang valid.', 'info');

  rows.forEach(pair => {
    history.push({ left: pair.left, right: pair.right, result: getOutcome(pair.left, pair.right), prediction: '—', ts: Date.now() + history.length });
  });

  rebuildPredictionsForAll();
  saveHistory();
  refreshAll();
  showToast(`${rows.length} ronde berhasil diimport.`, 'win');
  e.target.value = '';
});

function handleLogin() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  const found = AUTH_USERS.find(x => x.username === u && x.password === p);
  const error = document.getElementById('loginError');
  if (!found) {
    error.textContent = 'Username atau password salah.';
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username: found.username, role: found.role }));
  document.getElementById('loginOverlay').style.display = 'none';
  error.textContent = '';
  showToast('Login berhasil.', 'win');
}
document.getElementById('loginBtn').addEventListener('click', handleLogin);
document.getElementById('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem(SESSION_KEY);
  document.getElementById('loginOverlay').style.display = 'flex';
  showToast('Logout berhasil.', 'info');
});
function bootSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const session = JSON.parse(raw);
    if (session && session.username) document.getElementById('loginOverlay').style.display = 'none';
  } catch (e) {}
}

loadHistory();
bootSession();
refreshAll();
