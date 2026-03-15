const STORAGE_KEY = 'predictor_history_v3';
const SESSION_KEY = 'predictor_admin_session_v1';

let history = [];
let lastPrediction = null;
let currentContextSnapshot = null;
let latestModel = createEmptyModel();

function createEmptyModel() {
  return {
    totals: { left: 0, right: 0, draw: 0 },
    resultN1: {},
    resultN2: {},
    resultN3: {},
    parity1: {},
    parity2: {},
    diff1: {},
    diff2: {},
    combo1: {},
    combo2: {},
    missMemory: {}
  };
}

function ensureSession() {
  const session = localStorage.getItem(SESSION_KEY);
  const appShell = document.getElementById('appShell');
  const loginScreen = document.getElementById('loginScreen');
  const loginUser = document.getElementById('loginUser');

  if (session) {
    const parsed = JSON.parse(session);
    if (parsed?.username) {
      loginScreen.style.display = 'none';
      appShell.style.display = 'block';
      document.getElementById('activeUser').textContent = parsed.username;
      return;
    }
  }

  loginScreen.style.display = 'flex';
  appShell.style.display = 'none';
  setTimeout(() => loginUser.focus(), 50);
}

function bindAuth() {
  const form = document.getElementById('loginForm');
  const msg = document.getElementById('loginMsg');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;

    const matched = (window.AUTH_USERS || []).find(
      (u) => u.username === username && u.password === password
    );

    if (!matched) {
      msg.textContent = 'Username atau password salah.';
      return;
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify({ username: matched.username, role: matched.role }));
    msg.textContent = '';
    ensureSession();
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem(SESSION_KEY);
    ensureSession();
  });
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

function normalizeOutcome(left, right) {
  if (left > right) return 'left';
  if (right > left) return 'right';
  return 'draw';
}

function label(o) {
  if (o === 'left') return 'KIRI';
  if (o === 'right') return 'KANAN';
  return 'SERI';
}

function pct(v) {
  return Math.round(v * 100) + '%';
}

function parityDigit(v) {
  return v % 2 === 0 ? 'E' : 'O';
}

function pairParity(left, right) {
  return `${parityDigit(left)}${parityDigit(right)}`;
}

function diffBand(left, right) {
  const d = Math.abs(left - right);
  if (d === 0) return 'D0';
  if (d === 1) return 'D1';
  if (d <= 3) return 'D2_3';
  if (d <= 5) return 'D4_5';
  return 'D6_9';
}

function diffTrend(prevDiff, currDiff) {
  if (currDiff > prevDiff) return 'UP';
  if (currDiff < prevDiff) return 'DOWN';
  return 'FLAT';
}

function getResultSeq() {
  return history.map((r) => r.result);
}

function incrementMap(map, key, outcome) {
  if (!key) return;
  if (!map[key]) map[key] = { left: 0, right: 0, draw: 0, total: 0 };
  map[key][outcome] += 1;
  map[key].total += 1;
}

function getTopOutcome(counts) {
  if (!counts || !counts.total) return null;
  const sorted = ['left', 'right', 'draw']
    .map((k) => [k, counts[k]])
    .sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  return {
    outcome: top[0],
    prob: top[1] / counts.total,
    total: counts.total,
    spread: top[1] - sorted[1][1]
  };
}

function getContextAt(index) {
  if (index <= 0 || index > history.length) return null;
  const prev = history[index - 1];
  const prev2 = history[index - 2] || null;
  const prev3 = history[index - 3] || null;
  const prevDiff = Math.abs(prev.left - prev.right);
  const prevParity = pairParity(prev.left, prev.right);
  const prevTrend = prev2 ? diffTrend(Math.abs(prev2.left - prev2.right), prevDiff) : 'NA';

  return {
    result1: prev.result,
    result2: prev2 ? `${prev2.result}>${prev.result}` : null,
    result3: prev3 ? `${prev3.result}>${prev2.result}>${prev.result}` : null,
    parity1: prevParity,
    parity2: prev2 ? `${pairParity(prev2.left, prev2.right)}>${prevParity}` : null,
    diff1: `${diffBand(prev.left, prev.right)}|${prevTrend}`,
    diff2: prev2
      ? `${diffBand(prev2.left, prev2.right)}>${diffBand(prev.left, prev.right)}|${prevTrend}`
      : null,
    combo1: `${prev.result}|${prevParity}|${diffBand(prev.left, prev.right)}|${prevTrend}`,
    combo2: prev2
      ? `${prev2.result}>${prev.result}|${pairParity(prev2.left, prev2.right)}>${prevParity}|${diffBand(prev2.left, prev2.right)}>${diffBand(prev.left, prev.right)}`
      : null,
    prevWinnerParity: prev.result === 'draw'
      ? 'DRAW'
      : prev.result === 'left'
        ? parityDigit(prev.left)
        : parityDigit(prev.right)
  };
}

function rebuildModel() {
  latestModel = createEmptyModel();

  history.forEach((row) => {
    latestModel.totals[row.result] += 1;
  });

  for (let i = 1; i < history.length; i++) {
    const ctx = getContextAt(i);
    const actual = history[i].result;

    incrementMap(latestModel.resultN1, ctx.result1, actual);
    incrementMap(latestModel.resultN2, ctx.result2, actual);
    incrementMap(latestModel.resultN3, ctx.result3, actual);
    incrementMap(latestModel.parity1, ctx.parity1, actual);
    incrementMap(latestModel.parity2, ctx.parity2, actual);
    incrementMap(latestModel.diff1, ctx.diff1, actual);
    incrementMap(latestModel.diff2, ctx.diff2, actual);
    incrementMap(latestModel.combo1, ctx.combo1, actual);
    incrementMap(latestModel.combo2, ctx.combo2, actual);

    if (history[i].prediction && history[i].prediction !== '—' && history[i].prediction !== actual) {
      const missKey = history[i].contextKey || ctx.combo2 || ctx.combo1;
      if (!latestModel.missMemory[missKey]) {
        latestModel.missMemory[missKey] = { left: 0, right: 0, draw: 0, wrong: {} };
      }
      latestModel.missMemory[missKey][actual] += 1;
      latestModel.missMemory[missKey].wrong[history[i].prediction] =
        (latestModel.missMemory[missKey].wrong[history[i].prediction] || 0) + 1;
    }
  }
}

function addVote(votes, outcome, weight) {
  if (!outcome || !weight) return;
  votes[outcome] += weight;
}

function streakInfo(seq) {
  if (!seq.length) return null;
  const last = seq[seq.length - 1];
  let len = 1;
  for (let i = seq.length - 2; i >= 0; i--) {
    if (seq[i] === last) len += 1;
    else break;
  }
  return { outcome: last, length: len };
}

function getSnapshotForNextPrediction() {
  if (history.length < 1) return null;
  const ctx = getContextAt(history.length);
  return {
    ...ctx,
    missKey: ctx.combo2 || ctx.combo1,
    lastResult: history[history.length - 1].result
  };
}

function predict() {
  if (history.length < 3) {
    currentContextSnapshot = null;
    return null;
  }

  const ctx = getSnapshotForNextPrediction();
  currentContextSnapshot = ctx;
  const votes = { left: 0, right: 0, draw: 0 };
  const reasons = [];

  const collectors = [
    { map: latestModel.combo2, key: ctx.combo2, weight: 3.4, min: 2, label: 'Konteks-2 ronde' },
    { map: latestModel.combo1, key: ctx.combo1, weight: 3.0, min: 2, label: 'Konteks 1 ronde' },
    { map: latestModel.resultN3, key: ctx.result3, weight: 2.5, min: 2, label: 'Pola hasil 3' },
    { map: latestModel.resultN2, key: ctx.result2, weight: 2.1, min: 2, label: 'Pola hasil 2' },
    { map: latestModel.parity2, key: ctx.parity2, weight: 1.8, min: 2, label: 'Pola ganjil/genap 2' },
    { map: latestModel.parity1, key: ctx.parity1, weight: 1.3, min: 3, label: 'Ganjil/genap terakhir' },
    { map: latestModel.diff2, key: ctx.diff2, weight: 1.8, min: 2, label: 'Pola selisih 2' },
    { map: latestModel.diff1, key: ctx.diff1, weight: 1.4, min: 3, label: 'Selisih terakhir' },
    { map: latestModel.resultN1, key: ctx.result1, weight: 1.0, min: 3, label: 'Transisi dasar' }
  ];

  collectors.forEach((item) => {
    const res = getTopOutcome(item.map[item.key]);
    if (!res || res.total < item.min) return;
    const weight = item.weight * (0.55 + res.prob * 0.75) * (1 + Math.min(res.spread, 4) * 0.06);
    addVote(votes, res.outcome, weight);
    reasons.push(`${item.label} → ${label(res.outcome)} (${pct(res.prob)})`);
  });

  const seq = getResultSeq();
  const streak = streakInfo(seq);
  if (streak) {
    if (streak.length >= 4) {
      const opposite = streak.outcome === 'left' ? 'right' : streak.outcome === 'right' ? 'left' : 'draw';
      addVote(votes, opposite, 1.4 + Math.min(1.2, streak.length * 0.15));
      reasons.push(`Streak ${streak.length}x ${label(streak.outcome)} → potensi break ke ${label(opposite)}`);
    } else {
      addVote(votes, streak.outcome, 0.8 + streak.length * 0.2);
      reasons.push(`Streak ${streak.length}x → cenderung lanjut ${label(streak.outcome)}`);
    }
  }

  const totals = latestModel.totals;
  const totalRounds = totals.left + totals.right + totals.draw;
  if (totalRounds > 0) {
    ['left', 'right', 'draw'].forEach((outcome) => {
      addVote(votes, outcome, (totals[outcome] / totalRounds) * 0.8);
    });
  }

  const miss = latestModel.missMemory[ctx.missKey];
  if (miss) {
    const wrongTotal = (miss.left || 0) + (miss.right || 0) + (miss.draw || 0);
    if (wrongTotal > 0) {
      ['left', 'right', 'draw'].forEach((outcome) => {
        addVote(votes, outcome, (miss[outcome] / wrongTotal) * 2.6);
      });
      reasons.push(`Koreksi miss historis → ${label(getTopOutcome({ ...miss, total: wrongTotal }).outcome)}`);
    }
  }

  const ordered = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  const totalVote = ordered.reduce((sum, [, val]) => sum + val, 0) || 1;
  const winner = ordered[0][0];
  const confidence = Math.max(0.36, Math.min(0.96, ordered[0][1] / totalVote));

  return {
    outcome: winner,
    confidence,
    reasons: reasons.slice(0, 4),
    contextKey: ctx.missKey
  };
}

function updatePrediction() {
  const pred = predict();
  lastPrediction = pred;

  const banner = document.getElementById('predBanner');
  const predText = document.getElementById('predText');
  const predReason = document.getElementById('predReason');
  const predConf = document.getElementById('predConf');

  banner.className = 'prediction-banner';

  if (!pred) {
    banner.classList.add('pred-none');
    predText.className = 'pred-main none';
    predText.textContent = '— Menunggu Pola';
    predReason.textContent = `Minimal 3 ronde. Saat ini ${history.length} ronde tersedia.`;
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
  const leftW = history.filter((r) => r.result === 'left').length;
  const rightW = history.filter((r) => r.result === 'right').length;
  const drawW = history.filter((r) => r.result === 'draw').length;
  const total = history.length;

  document.getElementById('statLeft').textContent = leftW;
  document.getElementById('statRight').textContent = rightW;
  document.getElementById('statDraw').textContent = drawW;

  const withPred = history.filter((r) => r.prediction && r.prediction !== '—');
  if (withPred.length > 0) {
    const correct = withPred.filter((r) => r.prediction === r.result).length;
    document.getElementById('statAcc').textContent = pct(correct / withPred.length);
  } else {
    document.getElementById('statAcc').textContent = '—';
  }

  if (total > 0) {
    const lp = ((leftW / total) * 100).toFixed(1);
    const rp = ((rightW / total) * 100).toFixed(1);
    const dp = ((drawW / total) * 100).toFixed(1);
    document.getElementById('barLeft').style.width = lp + '%';
    document.getElementById('barRight').style.width = rp + '%';
    document.getElementById('barDraw').style.width = dp + '%';
    document.getElementById('labelLeft').textContent = `KIRI ${lp}%`;
    document.getElementById('labelRight').textContent = `KANAN ${rp}%`;
    document.getElementById('labelDraw').textContent = `SERI ${dp}%`;
  } else {
    document.getElementById('barLeft').style.width = '0%';
    document.getElementById('barRight').style.width = '0%';
    document.getElementById('barDraw').style.width = '0%';
    document.getElementById('labelLeft').textContent = 'KIRI 0%';
    document.getElementById('labelRight').textContent = 'KANAN 0%';
    document.getElementById('labelDraw').textContent = 'SERI 0%';
  }
}

function updateTable() {
  const tbody = document.getElementById('histTbody');
  const empty = document.getElementById('emptyMsg');
  const table = document.getElementById('histTable');

  if (history.length === 0) {
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
    if (idx === 0) tr.className = 'row-new';

    const resultTag = `<span class="tag ${row.result}">${label(row.result)}</span>`;
    const predTag = row.prediction && row.prediction !== '—'
      ? `<span class="tag ${row.prediction}">${label(row.prediction)}</span>`
      : `<span style="color:var(--dim);font-size:0.65rem">—</span>`;
    const correct = row.prediction && row.prediction !== '—'
      ? (row.prediction === row.result ? '<span class="correct-badge">✓</span>' : '<span class="wrong-badge">✗</span>')
      : '';

    tr.innerHTML = `
      <td style="color:var(--dim)">${history.length - idx}</td>
      <td style="color:var(--blue);font-family:'Orbitron',sans-serif;font-weight:700">${row.left}</td>
      <td style="color:var(--red);font-family:'Orbitron',sans-serif;font-weight:700">${row.right}</td>
      <td>${resultTag}</td>
      <td>${predTag}</td>
      <td>${correct}</td>
    `;
    tbody.appendChild(tr);
  });
}

function buildRoadColumns() {
  const columns = [];
  let currentCol = -1;
  let currentRow = 0;
  let previous = null;

  history.forEach((item) => {
    if (previous === null) {
      currentCol = 0;
      currentRow = 0;
    } else if (item.result === previous) {
      currentRow += 1;
    } else {
      currentCol += 1;
      currentRow = 0;
    }

    if (!columns[currentCol]) columns[currentCol] = [];
    columns[currentCol][currentRow] = item.result;
    previous = item.result;
  });

  return columns;
}

function updateRoadmap() {
  const wrap = document.getElementById('roadmapGrid');
  wrap.innerHTML = '';

  if (!history.length) {
    wrap.innerHTML = '<div class="roadmap-empty">Belum ada data untuk divisualisasikan.</div>';
    return;
  }

  const columns = buildRoadColumns();
  const maxRows = Math.max(...columns.map((c) => c.length));
  wrap.style.gridTemplateColumns = `repeat(${columns.length}, 26px)`;

  for (let row = 0; row < maxRows; row++) {
    for (let col = 0; col < columns.length; col++) {
      const cell = document.createElement('div');
      cell.className = 'road-cell';
      const value = columns[col]?.[row];
      if (value) {
        cell.classList.add(value);
        cell.textContent = value === 'left' ? 'L' : value === 'right' ? 'R' : 'D';
        cell.title = label(value);
      } else {
        cell.classList.add('empty');
      }
      wrap.appendChild(cell);
    }
  }
}

function refreshAll() {
  rebuildModel();
  updateStats();
  updatePrediction();
  updateTable();
  updateRoadmap();
}

function submitRound() {
  const lv = document.getElementById('inputLeft').value.trim();
  const rv = document.getElementById('inputRight').value.trim();

  if (lv === '' || rv === '') {
    showToast('Isi kedua angka terlebih dahulu!', 'info');
    return;
  }

  const left = parseInt(lv, 10);
  const right = parseInt(rv, 10);

  if (Number.isNaN(left) || Number.isNaN(right) || left < 0 || left > 9 || right < 0 || right > 9) {
    showToast('Angka harus antara 0 dan 9.', 'info');
    return;
  }

  document.getElementById('dispLeft').textContent = left;
  document.getElementById('dispRight').textContent = right;

  const result = normalizeOutcome(left, right);
  const prediction = lastPrediction ? lastPrediction.outcome : '—';
  const entry = {
    left,
    right,
    result,
    prediction,
    ts: Date.now(),
    contextKey: lastPrediction?.contextKey || currentContextSnapshot?.missKey || null,
    feature: {
      parity: pairParity(left, right),
      diffBand: diffBand(left, right)
    }
  };

  history.push(entry);
  saveHistory();

  if (prediction !== '—') {
    showToast(prediction === result ? '✓ Prediksi tepat' : '✗ Prediksi meleset', prediction === result ? 'win' : 'info');
  }

  document.getElementById('inputLeft').value = '';
  document.getElementById('inputRight').value = '';
  document.getElementById('inputLeft').focus();

  refreshAll();
}

function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 2200);
}

function exportCsv() {
  if (!history.length) {
    showToast('Tidak ada data untuk di-export.', 'info');
    return;
  }

  const header = ['Ronde', 'Kiri', 'Kanan', 'Hasil', 'Prediksi', 'Tepat', 'Parity', 'DiffBand', 'Timestamp'];
  const rows = history.map((r, i) => [
    i + 1,
    r.left,
    r.right,
    label(r.result),
    r.prediction && r.prediction !== '—' ? label(r.prediction) : '',
    r.prediction && r.prediction !== '—' ? (r.prediction === r.result ? 'Ya' : 'Tidak') : '',
    r.feature?.parity || pairParity(r.left, r.right),
    r.feature?.diffBand || diffBand(r.left, r.right),
    new Date(r.ts).toLocaleString('id-ID')
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `predictor_history_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV berhasil di-export.', 'win');
}

function parseImportedText(text) {
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const imported = [];

  lines.forEach((line) => {
    const clean = line.replace(/;/g, ',');
    const match = clean.match(/(\d)\s*[,\-|\s]\s*(\d)/);
    if (match) {
      imported.push({ left: Number(match[1]), right: Number(match[2]) });
      return;
    }

    const cols = clean.split(',').map((c) => c.trim());
    if (cols.length >= 2) {
      const left = Number(cols[0]);
      const right = Number(cols[1]);
      if (!Number.isNaN(left) && !Number.isNaN(right)) imported.push({ left, right });
    }
  });

  return imported.filter((r) => r.left >= 0 && r.left <= 9 && r.right >= 0 && r.right <= 9);
}

function importHistoryFromRows(rows) {
  if (!rows.length) {
    showToast('Format import tidak dikenali.', 'info');
    return;
  }

  history = [];
  lastPrediction = null;
  currentContextSnapshot = null;
  rebuildModel();

  rows.forEach((row, idx) => {
    if (idx >= 3) {
      lastPrediction = predict();
    }
    const result = normalizeOutcome(row.left, row.right);
    history.push({
      left: row.left,
      right: row.right,
      result,
      prediction: lastPrediction ? lastPrediction.outcome : '—',
      ts: Date.now() + idx,
      contextKey: lastPrediction?.contextKey || null,
      feature: {
        parity: pairParity(row.left, row.right),
        diffBand: diffBand(row.left, row.right)
      }
    });
    rebuildModel();
  });

  saveHistory();
  refreshAll();
  showToast(`Import ${rows.length} ronde berhasil.`, 'win');
}

function bindEvents() {
  document.getElementById('submitBtn').addEventListener('click', submitRound);
  document.getElementById('btnExport').addEventListener('click', exportCsv);

  document.getElementById('btnClear').addEventListener('click', () => {
    if (!confirm('Reset semua riwayat?')) return;
    history = [];
    lastPrediction = null;
    currentContextSnapshot = null;
    saveHistory();
    refreshAll();
    showToast('Data berhasil direset.', 'info');
  });

  ['inputLeft', 'inputRight'].forEach((id) => {
    const input = document.getElementById(id);
    input.addEventListener('input', (e) => {
      const dispId = id === 'inputLeft' ? 'dispLeft' : 'dispRight';
      document.getElementById(dispId).textContent = e.target.value !== '' ? e.target.value : '–';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitRound();
    });
  });

  document.getElementById('btnImport').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });

  document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseImportedText(text);
    importHistoryFromRows(rows);
    e.target.value = '';
  });
}

function init() {
  bindAuth();
  ensureSession();
  loadHistory();
  bindEvents();
  refreshAll();
}

document.addEventListener('DOMContentLoaded', init);
