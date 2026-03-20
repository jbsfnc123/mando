const STORAGE_KEY = 'predictor_mobile_auto_weight_history_v1';
const SESSION_KEY = 'predictor_mobile_auto_weight_session_v1';

const config = {
  threshold: 0.60,
  minExactSample: 4,
  minGenericSample: 6,
  autoWeighting: 1,
  autoWeightPower: 1.4,
  autoMinCoverage: 0.05
};

let history = [];
let lastPrediction = null;
let activeField = 'left';

function createCounts() { return { left: 0, right: 0, draw: 0, total: 0 }; }
function pairIndex(left, right) { return left * 10 + right; }
function label(o) { return o === 'left' ? 'KIRI' : o === 'right' ? 'KANAN' : o === 'draw' ? 'SERI' : 'SKIP'; }
function pct(v) { return Math.round((v || 0) * 100) + '%'; }
function getOutcome(left, right) { return left > right ? 'left' : right > left ? 'right' : 'draw'; }
function parity(n) { return n % 2 === 0 ? 'E' : 'O'; }
function sizeGroup(n) { return n <= 3 ? 'K' : n <= 6 ? 'S' : 'B'; }
function diffBucket(left, right) {
  const d = Math.abs(left - right);
  return d === 0 ? '0' : d <= 2 ? '1-2' : d <= 5 ? '3-5' : '6-9';
}
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
  } catch(e) { history = []; }
}
function saveHistory() { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); }

function buildIndicatorSignal(currentLeft, currentRight, subHistory, type) {
  const counts = createCounts();

  if (type === 'exact') {
    for (let i = 0; i < subHistory.length - 1; i++) {
      const curr = subHistory[i], next = subHistory[i + 1];
      if (curr.left === currentLeft && curr.right === currentRight) { counts[next.result]++; counts.total++; }
    }
    if (counts.total < config.minExactSample) return null;
    return scoreSignal('Exact combo', counts, counts.total);
  }

  if (type === 'near') {
    const currentOutcome = getOutcome(currentLeft, currentRight);
    const weighted = createCounts();
    for (let i = 0; i < subHistory.length - 1; i++) {
      const curr = subHistory[i], next = subHistory[i + 1];
      let distance = 99;
      if (currentOutcome === 'left') {
        distance = Math.abs(curr.left - currentLeft) * 2 + Math.abs(curr.right - currentRight);
        if (curr.left !== currentLeft) distance += 0.5;
      } else if (currentOutcome === 'right') {
        distance = Math.abs(curr.right - currentRight) * 2 + Math.abs(curr.left - currentLeft);
        if (curr.right !== currentRight) distance += 0.5;
      } else {
        distance = Math.abs(curr.left - currentLeft) + Math.abs(curr.right - currentRight);
      }
      if (distance <= 3) {
        const w = 1 / (1 + distance);
        weighted[next.result] += w;
        weighted.total += w;
      }
    }
    if (weighted.total < 2.5) return null;
    return scoreSignal('Combo terdekat', weighted, weighted.total);
  }

  if (type === 'diff') {
    const key = diffBucket(currentLeft, currentRight);
    for (let i = 0; i < subHistory.length - 1; i++) {
      const curr = subHistory[i], next = subHistory[i + 1];
      if (diffBucket(curr.left, curr.right) === key) { counts[next.result]++; counts.total++; }
    }
    if (counts.total < config.minGenericSample) return null;
    return scoreSignal('Selisih angka', counts, counts.total);
  }

  if (type === 'winnerSide') {
    const key = getOutcome(currentLeft, currentRight);
    for (let i = 0; i < subHistory.length - 1; i++) {
      const curr = subHistory[i], next = subHistory[i + 1];
      if (curr.result === key) { counts[next.result]++; counts.total++; }
    }
    if (counts.total < config.minGenericSample) return null;
    return scoreSignal('Sisi pemenang saat ini', counts, counts.total);
  }

  if (type === 'sizeGroup') {
    const key = `${sizeGroup(currentLeft)}${sizeGroup(currentRight)}`;
    for (let i = 0; i < subHistory.length - 1; i++) {
      const curr = subHistory[i], next = subHistory[i + 1];
      if (`${sizeGroup(curr.left)}${sizeGroup(curr.right)}` === key) { counts[next.result]++; counts.total++; }
    }
    if (counts.total < config.minGenericSample) return null;
    return scoreSignal('Besar-kecil angka', counts, counts.total);
  }

  if (type === 'oddEven') {
    const key = `${parity(currentLeft)}${parity(currentRight)}`;
    for (let i = 0; i < subHistory.length - 1; i++) {
      const curr = subHistory[i], next = subHistory[i + 1];
      if (`${parity(curr.left)}${parity(curr.right)}` === key) { counts[next.result]++; counts.total++; }
    }
    if (counts.total < config.minGenericSample) return null;
    return scoreSignal('Ganjil-genap', counts, counts.total);
  }

  if (type === 'recency') {
    const start = Math.max(0, subHistory.length - 30);
    const weighted = createCounts();
    for (let i = start; i < subHistory.length - 1; i++) {
      const curr = subHistory[i], next = subHistory[i + 1];
      const ageBoost = 0.6 + ((i - start + 1) / Math.max(subHistory.length - start, 1)) * 0.8;
      const exact = curr.left === currentLeft && curr.right === currentRight;
      const sameDiff = diffBucket(curr.left, curr.right) === diffBucket(currentLeft, currentRight);
      const sameWinner = curr.result === getOutcome(currentLeft, currentRight);
      if (exact) {
        weighted[next.result] += 1.4 * ageBoost;
        weighted.total += 1.4 * ageBoost;
      } else if (sameDiff || sameWinner) {
        weighted[next.result] += 0.7 * ageBoost;
        weighted.total += 0.7 * ageBoost;
      }
    }
    if (weighted.total < 3) return null;
    return scoreSignal('Data terbaru / recency', weighted, weighted.total);
  }
  return null;
}

function scoreSignal(name, counts, sample) {
  const ordered = [['left', counts.left], ['right', counts.right], ['draw', counts.draw]].sort((a,b) => b[1]-a[1]);
  return { name, outcome: ordered[0][0], confidence: ordered[0][1] / counts.total, sample, counts };
}

function getIndicatorTypeMap() {
  return [
    { type: 'exact', name: 'Exact combo' },
    { type: 'near', name: 'Combo terdekat' },
    { type: 'diff', name: 'Selisih angka' },
    { type: 'winnerSide', name: 'Sisi pemenang saat ini' },
    { type: 'sizeGroup', name: 'Besar-kecil angka' },
    { type: 'oddEven', name: 'Ganjil-genap' },
    { type: 'recency', name: 'Data terbaru / recency' }
  ];
}

function runIndicatorBacktestWithHistory(sourceHistory, indicatorType) {
  let signalCount = 0, correctCount = 0, totalRounds = 0;
  for (let i = 1; i < sourceHistory.length; i++) {
    const subHistory = sourceHistory.slice(0, i);
    if (!subHistory.length) continue;
    const last = subHistory[subHistory.length - 1];
    const signal = buildIndicatorSignal(last.left, last.right, subHistory, indicatorType);
    totalRounds++;
    if (!signal) continue;
    signalCount++;
    if (signal.outcome === sourceHistory[i].result) correctCount++;
  }
  return {
    signalCount,
    correctCount,
    totalRounds,
    accuracy: signalCount ? correctCount / signalCount : 0,
    coverage: totalRounds ? signalCount / totalRounds : 0,
    score: signalCount ? ((correctCount / signalCount) * 0.7 + (signalCount / Math.max(totalRounds,1)) * 0.3) : 0
  };
}

function getBaseIndicatorWeights() {
  return {
    'Exact combo': 0.40,
    'Combo terdekat': 0.20,
    'Selisih angka': 0.10,
    'Sisi pemenang saat ini': 0.10,
    'Besar-kecil angka': 0.08,
    'Ganjil-genap': 0.05,
    'Data terbaru / recency': 0.07
  };
}

function computeAutoWeights(sourceHistory) {
  const base = getBaseIndicatorWeights();
  const result = {};
  getIndicatorTypeMap().forEach(ind => {
    const perf = runIndicatorBacktestWithHistory(sourceHistory, ind.type);
    let multiplier = 1;
    if (config.autoWeighting === 1) {
      if (perf.coverage < config.autoMinCoverage || perf.signalCount < 3) {
        multiplier = 0.35;
      } else {
        multiplier = Math.pow(Math.max(perf.score, 0.05), config.autoWeightPower);
      }
    }
    result[ind.name] = {
      baseWeight: base[ind.name],
      perf,
      multiplier,
      finalWeight: base[ind.name] * multiplier
    };
  });
  return result;
}

function normalizeAutoWeights(weightMap) {
  const total = Object.values(weightMap).reduce((s, x) => s + x.finalWeight, 0) || 1;
  const normalized = {};
  Object.keys(weightMap).forEach(k => normalized[k] = weightMap[k].finalWeight / total);
  return normalized;
}

function computePrediction(subHistory) {
  if (!subHistory.length) return null;
  const last = subHistory[subHistory.length - 1];
  const indicators = getIndicatorTypeMap()
    .map(ind => buildIndicatorSignal(last.left, last.right, subHistory, ind.type))
    .filter(Boolean);

  const autoWeightsRaw = computeAutoWeights(subHistory);
  const weights = normalizeAutoWeights(autoWeightsRaw);

  if (!indicators.length) {
    return {
      outcome: 'skip',
      confidence: 0,
      indicators: [],
      autoWeightsRaw,
      autoWeights: weights,
      reason: 'Belum cukup sampel untuk indikator utama.'
    };
  }

  const scores = { left: 0, right: 0, draw: 0 };
  const votes = { left: 0, right: 0, draw: 0 };

  indicators.forEach(ind => {
    const baseWeight = weights[ind.name] || 0.05;
    const sampleFactor = Math.min(ind.sample / 12, 1);
    const dominanceFactor = ind.confidence;
    const effectiveWeight = baseWeight * (0.55 + sampleFactor * 0.45) * (0.7 + dominanceFactor * 0.3);
    scores[ind.outcome] += effectiveWeight * ind.confidence;
    votes[ind.outcome] += 1;
    ind.effectiveWeight = effectiveWeight;
  });

  ['left', 'right', 'draw'].forEach(k => {
    if (votes[k] >= 3) scores[k] += 0.04 * votes[k];
  });

  const ordered = Object.entries(scores).sort((a,b) => b[1]-a[1]);
  const winner = ordered[0][0];
  const second = ordered[1][0];
  const totalScore = scores.left + scores.right + scores.draw || 1;
  const normalized = scores[winner] / totalScore;
  const margin = scores[winner] - scores[second];
  const strongEnough = normalized >= config.threshold && margin >= 0.04;

  return {
    outcome: strongEnough ? winner : 'skip',
    confidence: normalized,
    indicators,
    autoWeightsRaw,
    autoWeights: weights,
    reason: strongEnough
      ? `Confidence ${pct(normalized)} melewati threshold ${pct(config.threshold)}.`
      : `Confidence ${pct(normalized)} di bawah threshold atau margin tipis, sistem skip.`
  };
}

function rebuildPredictionsForHistory() {
  for (let i = 0; i < history.length; i++) history[i].prediction = '—';
  for (let i = 1; i < history.length; i++) {
    const subHistory = history.slice(0, i);
    const pred = computePrediction(subHistory);
    history[i].prediction = pred ? pred.outcome : '—';
  }
}

function getComboActiveHistory(left, right) {
  const out = [];
  for (let i = 0; i < history.length - 1; i++) {
    const curr = history[i], next = history[i + 1];
    if (curr.left === left && curr.right === right) out.push(next.result);
  }
  return out;
}

function updatePredictionPanel() {
  const card = document.getElementById('predCard');
  const main = document.getElementById('predMain');
  const conf = document.getElementById('predConf');
  const reason = document.getElementById('predReason');
  const activeCombo = document.getElementById('activeCombo');
  const sourceInfo = document.getElementById('sourceInfo');

  card.className = 'card prediction none';

  if (!history.length) {
    main.className = 'pred-main none';
    main.textContent = '— Menunggu Data';
    conf.textContent = '—';
    reason.textContent = 'Masukkan ronde pertama untuk membangun riwayat.';
    activeCombo.textContent = 'Belum ada combo aktif.';
    sourceInfo.textContent = 'Belum ada sumber prediksi.';
    lastPrediction = null;
    return;
  }

  const last = history[history.length - 1];
  activeCombo.textContent = `Combo terakhir: ${last.left} ${last.right}.`;
  const pred = computePrediction(history);
  lastPrediction = pred;

  if (!pred) {
    main.className = 'pred-main none';
    main.textContent = '— Belum Ada Sinyal';
    conf.textContent = '—';
    reason.textContent = 'Belum cukup data.';
    sourceInfo.textContent = 'Belum ada indikator valid.';
    return;
  }

  card.classList.remove('none');
  card.classList.add(pred.outcome);
  main.className = `pred-main ${pred.outcome}`;
  main.textContent = pred.outcome === 'skip' ? '▶ SKIP / TIDAK ADA SINYAL' : `▶ ${label(pred.outcome)}`;
  conf.textContent = pct(pred.confidence);
  reason.textContent = pred.reason;
  sourceInfo.textContent = pred.indicators.length
    ? `Indikator valid: ${pred.indicators.slice(0,4).map(x => x.name).join(', ')}`
    : 'Belum ada indikator valid.';
}

function updateIndicatorList() {
  const wrap = document.getElementById('indicatorList');
  wrap.innerHTML = '';
  if (!lastPrediction || !lastPrediction.autoWeightsRaw) {
    wrap.innerHTML = '<div class="indicator-item"><div class="ind-name">Belum ada data indikator.</div></div>';
    return;
  }

  const items = Object.entries(lastPrediction.autoWeightsRaw)
    .map(([name, meta]) => ({
      name,
      ...meta,
      normalized: lastPrediction.autoWeights[name] || 0,
      currentSignal: lastPrediction.indicators.find(x => x.name === name)
    }))
    .sort((a,b) => b.normalized - a.normalized);

  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'indicator-item';
    const signalText = item.currentSignal ? `${label(item.currentSignal.outcome)} (${pct(item.currentSignal.confidence)})` : 'Tidak aktif';
    el.innerHTML = `
      <div class="indicator-head">
        <div class="ind-name">${item.name}</div>
        <div class="ind-percent">${(item.normalized * 100).toFixed(1)}%</div>
      </div>
      <div class="ind-meta">Signal: ${signalText} · Akurasi backtest: ${pct(item.perf.accuracy)} · Coverage: ${pct(item.perf.coverage)}</div>
    `;
    wrap.appendChild(el);
  });
}

function updateStats() {
  document.getElementById('statLeft').textContent = history.filter(r => r.result === 'left').length;
  document.getElementById('statRight').textContent = history.filter(r => r.result === 'right').length;
  document.getElementById('statDraw').textContent = history.filter(r => r.result === 'draw').length;
  const predicted = history.filter(r => r.prediction && r.prediction !== '—' && r.prediction !== 'skip');
  document.getElementById('statAcc').textContent = predicted.length
    ? pct(predicted.filter(r => r.prediction === r.result).length / predicted.length)
    : '—';
}

function updateComboHistory() {
  const wrap = document.getElementById('comboHistory');
  const hint = document.getElementById('comboHistoryHint');
  wrap.innerHTML = '';
  if (!history.length) {
    hint.textContent = 'Belum ada history combo aktif.';
    return;
  }
  const last = history[history.length - 1];
  const comboHist = getComboActiveHistory(last.left, last.right);
  if (!comboHist.length) {
    hint.textContent = `Combo ${last.left} ${last.right} belum punya history exact sebelumnya.`;
    return;
  }
  hint.textContent = `${last.left} ${last.right} = ${comboHist.map(label).join(' , ')}`;
  comboHist.forEach(r => {
    const el = document.createElement('span');
    el.className = `tag ${r}`;
    el.textContent = label(r);
    wrap.appendChild(el);
  });
}

function rebuildPairTransitions() {
  const arr = Array.from({ length: 100 }, () => createCounts());
  for (let i = 0; i < history.length - 1; i++) {
    const curr = history[i], next = history[i + 1];
    const idx = pairIndex(curr.left, curr.right);
    arr[idx][next.result] += 1;
    arr[idx].total += 1;
  }
  return arr;
}

function renderMatrix() {
  const matrix = rebuildPairTransitions();
  const table = document.getElementById('matrixTable');
  let html = '<thead><tr>';
  for (let l = 0; l <= 9; l++) html += `<th>${l} X</th>`;
  html += '</tr></thead><tbody>';
  for (let r = 0; r <= 9; r++) {
    html += '<tr>';
    for (let l = 0; l <= 9; l++) {
      const counts = matrix[pairIndex(l, r)];
      if (!counts.total) {
        html += `<td>${l} ${r}<div class="hint" style="margin-top:2px;font-size:.52rem">—</div></td>`;
      } else {
        const best = scoreSignal('x', counts, counts.total);
        html += `<td>${l} ${r}<div style="margin-top:4px"><span class="tag ${best.outcome}">${label(best.outcome)}</span></div><div class="hint" style="margin-top:4px;font-size:.52rem">${counts.total}</div></td>`;
      }
    }
    html += '</tr>';
  }
  html += '</tbody>';
  table.innerHTML = html;
}

function refreshAll() {
  updatePredictionPanel();
  updateStats();
  updateIndicatorList();
  updateComboHistory();
  renderMatrix();
}

function setActiveField(field) {
  activeField = field;
  document.getElementById('leftBox').classList.toggle('active', field === 'left');
  document.getElementById('rightBox').classList.toggle('active', field === 'right');
}
function setDigit(value) {
  const disp = document.getElementById(activeField === 'left' ? 'dispLeft' : 'dispRight');
  disp.textContent = value;
}
function clearDigit() {
  const disp = document.getElementById(activeField === 'left' ? 'dispLeft' : 'dispRight');
  disp.textContent = '–';
}
function buildKeypad() {
  const keys = ['1','2','3','4','5','6','7','8','9','C','0','⌫'];
  const wrap = document.getElementById('keypad');
  keys.forEach(k => {
    const btn = document.createElement('button');
    btn.className = 'key';
    btn.textContent = k;
    btn.addEventListener('click', () => {
      if (k === 'C' || k === '⌫') clearDigit();
      else setDigit(k);
    });
    wrap.appendChild(btn);
  });
}

function parseImportText(text) {
  const rows = [];
  text.split(/\r?\n/).forEach(line => {
    const clean = line.trim();
    if (!clean) return;
    const nums = clean.match(/\d+/g);
    if (!nums || nums.length < 2) return;
    const left = parseInt(nums[0], 10), right = parseInt(nums[1], 10);
    if ([left, right].some(n => Number.isNaN(n) || n < 0 || n > 9)) return;
    rows.push({ left, right, result: getOutcome(left, right), prediction: '—', ts: Date.now() + rows.length });
  });
  return rows;
}

document.getElementById('leftBox').addEventListener('click', () => setActiveField('left'));
document.getElementById('rightBox').addEventListener('click', () => setActiveField('right'));

document.getElementById('submitBtn').addEventListener('click', () => {
  const ltxt = document.getElementById('dispLeft').textContent;
  const rtxt = document.getElementById('dispRight').textContent;
  if (ltxt === '–' || rtxt === '–') return showToast('Isi kedua angka terlebih dahulu.', 'info');

  const left = parseInt(ltxt, 10), right = parseInt(rtxt, 10);
  history.push({ left, right, result: getOutcome(left, right), prediction: '—', ts: Date.now() });
  rebuildPredictionsForHistory();
  saveHistory();
  refreshAll();

  const latest = history[history.length - 1];
  if (latest.prediction && latest.prediction !== '—') {
    if (latest.prediction === 'skip') showToast('Signal dilewati: skip', 'info');
    else showToast(latest.prediction === latest.result ? 'Prediksi Tepat!' : 'Prediksi Meleset', latest.prediction === latest.result ? 'win' : 'info');
  }

  document.getElementById('dispLeft').textContent = '–';
  document.getElementById('dispRight').textContent = '–';
  setActiveField('left');
});

document.getElementById('importFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const rows = parseImportText(text);
  if (!rows.length) return showToast('File tidak valid.', 'info');
  history = history.concat(rows);
  rebuildPredictionsForHistory();
  saveHistory();
  refreshAll();
  showToast(`${rows.length} ronde berhasil diimport.`, 'win');
  e.target.value = '';
});

document.getElementById('btnExport').addEventListener('click', () => {
  if (!history.length) return showToast('Tidak ada data untuk diexport.', 'info');
  const template = history.map(r => `${r.left},${r.right}`).join('\n');
  const blob = new Blob([template], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `predictor_mobile_template_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Template export berhasil dibuat.', 'win');
});

document.getElementById('btnReset').addEventListener('click', () => {
  if (!confirm('Reset semua data histori? Tindakan ini tidak bisa dibatalkan.')) return;
  history = [];
  lastPrediction = null;
  saveHistory();
  refreshAll();
  document.getElementById('dispLeft').textContent = '–';
  document.getElementById('dispRight').textContent = '–';
  setActiveField('left');
  showToast('Data berhasil direset.', 'win');
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
  } catch(e) {}
}

buildKeypad();
loadHistory();
rebuildPredictionsForHistory();
bootSession();
refreshAll();
setActiveField('left');
