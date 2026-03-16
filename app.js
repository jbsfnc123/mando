const STORAGE_KEY = 'predictor_history_v6';
const SETTINGS_KEY = 'predictor_method_settings_v3';
const SESSION_KEY = 'predictor_admin_session_v1';

let history = [];
let lastPrediction = null;
let recommendationCache = null;

const defaultMethodSettings = {
  markov1: { enabled: true, weight: 2.0 },
  markov2: { enabled: true, weight: 2.5 },
  markov3: { enabled: true, weight: 3.0 },
  freqBias: { enabled: true, weight: 1.0 },
  streak: { enabled: true, weight: 1.2 },
  alternate: { enabled: true, weight: 1.8 },
  oddEven: { enabled: true, weight: 1.7 },
  diffBucket: { enabled: true, weight: 1.6 },
  diffTrend: { enabled: true, weight: 1.2 },
  exactPairNext: { enabled: true, weight: 2.8 },
  pairTypeNext: { enabled: true, weight: 2.0 },
  missLearning: { enabled: true, weight: 1.4 }
};

const methodMeta = {
  markov3: { name: 'Pola 3 hasil', desc: 'Melihat 3 hasil terakhir lalu mencari kelanjutan terdekat dari histori.' },
  markov2: { name: 'Pola 2 hasil', desc: 'Membaca transisi berdasarkan 2 hasil terakhir.' },
  markov1: { name: 'Pola 1 hasil', desc: 'Membaca kecenderungan hasil setelah hasil terakhir.' },
  freqBias: { name: 'Frekuensi global', desc: 'Memberi bias pada hasil yang paling sering muncul.' },
  streak: { name: 'Kemenangan beruntun', desc: 'Mempertimbangkan pola lanjut atau patah saat streak terjadi.' },
  alternate: { name: 'Pola selang-seling', desc: 'Membaca pola pergantian kiri-kanan/draw dari ronde terakhir.' },
  oddEven: { name: 'Ganjil / genap', desc: 'Menghubungkan kombinasi ganjil-genap dengan hasil ronde berikutnya.' },
  diffBucket: { name: 'Selisih angka', desc: 'Belajar dari besar kecilnya selisih angka yang baru keluar.' },
  diffTrend: { name: 'Arah selisih', desc: 'Melihat perubahan selisih naik/turun/stabil ke hasil berikutnya.' },
  exactPairNext: { name: 'Kombinasi angka exact', desc: 'Menggunakan pasangan angka (kiri,kanan) untuk menebak hasil berikutnya.' },
  pairTypeNext: { name: 'Tipe kombinasi angka', desc: 'Menggunakan tipe pasangan seperti besar-kecil, parity, arah menang.' },
  missLearning: { name: 'Belajar dari miss', desc: 'Mengoreksi konteks yang sering menghasilkan prediksi meleset.' }
};

function cloneDefaultSettings() { return JSON.parse(JSON.stringify(defaultMethodSettings)); }
let methodSettings = loadMethodSettings();

function loadMethodSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return cloneDefaultSettings();
    const parsed = JSON.parse(raw);
    const merged = cloneDefaultSettings();
    Object.keys(merged).forEach(k => {
      if (parsed[k]) {
        merged[k].enabled = !!parsed[k].enabled;
        const w = parseFloat(parsed[k].weight);
        merged[k].weight = Number.isFinite(w) ? clampWeight(w) : merged[k].weight;
      }
    });
    return merged;
  } catch (e) { return cloneDefaultSettings(); }
}
function saveMethodSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(methodSettings)); }
function clampWeight(v) { return Math.max(0, Math.min(10, Number(v))); }
function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    history = raw ? JSON.parse(raw) : [];
  } catch (e) { history = []; }
}
function saveHistory() { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); }

function label(o) { return o === 'left' ? 'KIRI' : o === 'right' ? 'KANAN' : 'SERI'; }
function pct(p) { return Math.round((p || 0) * 100) + '%'; }
function showToast(msg, type='info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 2200);
}
function getOutcome(left, right) { return left > right ? 'left' : right > left ? 'right' : 'draw'; }
function parity(n) { return n % 2 === 0 ? 'E' : 'O'; }
function makeCounts() { return { left: 0, right: 0, draw: 0 }; }
function pairSignature(entry) { return `${entry.left},${entry.right}`; }
function diffBucket(entry) {
  const d = Math.abs(entry.left - entry.right);
  return d === 0 ? '0' : d <= 2 ? '1-2' : d <= 5 ? '3-5' : '6-9';
}
function pairTypeSignature(entry) {
  const side = entry.left > entry.right ? 'L' : entry.right > entry.left ? 'R' : 'D';
  const levelL = entry.left <= 3 ? 'S' : entry.left <= 6 ? 'M' : 'B';
  const levelR = entry.right <= 3 ? 'S' : entry.right <= 6 ? 'M' : 'B';
  return `${parity(entry.left)}${parity(entry.right)}|${levelL}${levelR}|${side}|${diffBucket(entry)}`;
}
function diffTrend(curr, prev) {
  if (!prev) return null;
  const c = Math.abs(curr.left - curr.right);
  const p = Math.abs(prev.left - prev.right);
  if (c > p) return 'up';
  if (c < p) return 'down';
  return 'flat';
}
function outcomeSeq(arr = history) { return arr.map(r => r.result); }
function tallyOutcomeVotes(counts) {
  const total = counts.left + counts.right + counts.draw;
  if (!total) return null;
  const winner = Object.entries(counts).sort((a,b) => b[1] - a[1])[0][0];
  return { outcome: winner, prob: counts[winner] / total, total };
}

function markovPredict(seq, n) {
  if (seq.length < n + 1) return null;
  const context = seq.slice(-n).join(',');
  const counts = makeCounts();
  for (let i = n; i < seq.length; i++) {
    const window = seq.slice(i - n, i).join(',');
    if (window === context) counts[seq[i]]++;
  }
  return tallyOutcomeVotes(counts);
}
function streakInfo(seq) {
  if (!seq.length) return null;
  const last = seq[seq.length - 1];
  let len = 1;
  for (let i = seq.length - 2; i >= 0; i--) {
    if (seq[i] === last) len++;
    else break;
  }
  return { outcome: last, length: len };
}
function freqPredict(seq) {
  const counts = makeCounts();
  seq.forEach(s => counts[s]++);
  return tallyOutcomeVotes(counts);
}
function exactPairNextPredict(arr = history) {
  if (arr.length < 2) return null;
  const sig = pairSignature(arr[arr.length - 1]);
  const counts = makeCounts();
  for (let i = 0; i < arr.length - 1; i++) if (pairSignature(arr[i]) === sig) counts[arr[i + 1].result]++;
  return tallyOutcomeVotes(counts);
}
function pairTypeNextPredict(arr = history) {
  if (arr.length < 2) return null;
  const sig = pairTypeSignature(arr[arr.length - 1]);
  const counts = makeCounts();
  for (let i = 0; i < arr.length - 1; i++) if (pairTypeSignature(arr[i]) === sig) counts[arr[i + 1].result]++;
  return tallyOutcomeVotes(counts);
}
function oddEvenPredict(arr = history) {
  if (arr.length < 2) return null;
  const key = `${parity(arr[arr.length - 1].left)}${parity(arr[arr.length - 1].right)}`;
  const counts = makeCounts();
  for (let i = 0; i < arr.length - 1; i++) {
    const k = `${parity(arr[i].left)}${parity(arr[i].right)}`;
    if (k === key) counts[arr[i + 1].result]++;
  }
  return tallyOutcomeVotes(counts);
}
function diffBucketPredict(arr = history) {
  if (arr.length < 2) return null;
  const key = diffBucket(arr[arr.length - 1]);
  const counts = makeCounts();
  for (let i = 0; i < arr.length - 1; i++) if (diffBucket(arr[i]) === key) counts[arr[i + 1].result]++;
  return tallyOutcomeVotes(counts);
}
function diffTrendPredict(arr = history) {
  if (arr.length < 3) return null;
  const trend = diffTrend(arr[arr.length - 1], arr[arr.length - 2]);
  if (!trend) return null;
  const counts = makeCounts();
  for (let i = 1; i < arr.length - 1; i++) if (diffTrend(arr[i], arr[i - 1]) === trend) counts[arr[i + 1].result]++;
  return tallyOutcomeVotes(counts);
}
function alternatePatternPredict(seq) {
  if (seq.length < 3) return null;
  const a = seq[seq.length - 3], b = seq[seq.length - 2], c = seq[seq.length - 1];
  const counts = makeCounts();
  if (a !== b && a === c) {
    counts[b] += 3; counts.draw += 0.5;
    return tallyOutcomeVotes(counts);
  }
  if (b !== c) {
    counts[b] += 2; counts[a] += 1;
    return tallyOutcomeVotes(counts);
  }
  return null;
}
function buildContextSignature(index, arr = history) {
  const curr = arr[index];
  if (!curr) return null;
  const prev = arr[index - 1];
  return [curr.result, `${parity(curr.left)}${parity(curr.right)}`, diffBucket(curr), prev ? diffTrend(curr, prev) : 'none', prev ? prev.result : 'none', pairTypeSignature(curr)].join('|');
}
function missLearningPredict(arr = history) {
  if (arr.length < 6) return null;
  const currentCtx = buildContextSignature(arr.length - 1, arr);
  if (!currentCtx) return null;
  const stats = {};
  for (let i = 0; i < arr.length; i++) {
    const row = arr[i];
    if (!row.contextKey || !row.prediction || row.prediction === '—') continue;
    if (!stats[row.contextKey]) stats[row.contextKey] = { miss: makeCounts(), hit: makeCounts() };
    if (row.prediction === row.result) stats[row.contextKey].hit[row.result]++;
    else stats[row.contextKey].miss[row.result]++;
  }
  const ctx = stats[currentCtx];
  if (!ctx) return null;
  const counts = makeCounts();
  counts.left = ctx.hit.left + ctx.miss.left * 1.3;
  counts.right = ctx.hit.right + ctx.miss.right * 1.3;
  counts.draw = ctx.hit.draw + ctx.miss.draw * 1.3;
  return tallyOutcomeVotes(counts);
}

function getMethodSignal(key, arr = history) {
  const seq = outcomeSeq(arr);
  switch (key) {
    case 'markov3': return markovPredict(seq, 3);
    case 'markov2': return markovPredict(seq, 2);
    case 'markov1': return markovPredict(seq, 1);
    case 'freqBias': return freqPredict(seq);
    case 'alternate': return alternatePatternPredict(seq);
    case 'oddEven': return oddEvenPredict(arr);
    case 'diffBucket': return diffBucketPredict(arr);
    case 'diffTrend': return diffTrendPredict(arr);
    case 'exactPairNext': return exactPairNextPredict(arr);
    case 'pairTypeNext': return pairTypeNextPredict(arr);
    case 'missLearning': return missLearningPredict(arr);
    case 'streak': {
      const s = streakInfo(seq);
      if (!s) return null;
      const counts = makeCounts();
      if (s.length >= 4) {
        const opposite = s.outcome === 'left' ? 'right' : s.outcome === 'right' ? 'left' : 'draw';
        counts[opposite] += 1.5;
      } else if (s.length >= 2) {
        counts[s.outcome] += 1;
      } else return null;
      return tallyOutcomeVotes(counts);
    }
    default: return null;
  }
}

function addReason(reasons, text) { if (reasons.length < 4) reasons.push(text); }
function applyMethodVote(votes, reasons, key, arr = history, settings = methodSettings) {
  const cfg = settings[key];
  if (!cfg || !cfg.enabled || cfg.weight <= 0) return;
  const signal = getMethodSignal(key, arr);
  if (!signal) return;
  const minTotalRequired = ['markov3','markov2','markov1','exactPairNext','pairTypeNext','oddEven','diffBucket','diffTrend','missLearning'].includes(key) ? 2 : 0;
  if (minTotalRequired && signal.total !== undefined && signal.total < minTotalRequired) return;
  votes[signal.outcome] += cfg.weight * (signal.prob || 1);
  addReason(reasons, `${methodMeta[key].name} → ${label(signal.outcome)} (${pct(signal.prob)}) · bobot ${cfg.weight}`);
}
function predictWithSettings(arr = history, settings = methodSettings) {
  if (arr.length < 3) return null;
  const votes = makeCounts();
  const reasons = [];
  Object.keys(methodMeta).forEach(key => applyMethodVote(votes, reasons, key, arr, settings));
  const sorted = Object.entries(votes).sort((a,b) => b[1] - a[1]);
  const totalVotes = sorted.reduce((s,[,v]) => s + v, 0);
  if (!totalVotes || sorted[0][1] <= 0) return null;
  return { outcome: sorted[0][0], confidence: Math.min(sorted[0][1] / totalVotes, 0.95), reasons, rawVotes: votes };
}
function predict() { return predictWithSettings(history, methodSettings); }

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
    predText.textContent = '— Menganalisis...';
    predReason.textContent = `Butuh minimal 3 ronde dan minimal satu metode aktif berbobot > 0.`;
    predConf.textContent = '—';
    return;
  }
  banner.classList.add('pred-' + lastPrediction.outcome);
  predText.className = 'pred-main ' + lastPrediction.outcome;
  predText.textContent = '▶ ' + label(lastPrediction.outcome);
  predReason.textContent = lastPrediction.reasons.join(' · ');
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
    empty.style.display = 'block'; table.style.display = 'none'; tbody.innerHTML = ''; return;
  }
  empty.style.display = 'none'; table.style.display = 'table'; tbody.innerHTML = '';
  [...history].reverse().forEach((row, idx) => {
    const tr = document.createElement('tr');
    const predTag = row.prediction && row.prediction !== '—' ? `<span class="tag ${row.prediction}">${label(row.prediction)}</span>` : `<span class="tag off">—</span>`;
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
    if (!current || current.result !== row.result) { current = { result: row.result, length: 1 }; cols.push(current); }
    else current.length++;
  });
  return cols.slice(-20);
}
function updateBoard() {
  const grid = document.getElementById('boardGrid');
  grid.innerHTML = '';
  const width = 20, height = 20, cols = buildRunColumns();
  for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) {
    const cell = document.createElement('div'); cell.className = 'board-cell'; grid.appendChild(cell);
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

function renderSettings() {
  const grid = document.getElementById('settingsGrid');
  grid.innerHTML = '';
  Object.keys(methodMeta).forEach(key => {
    const meta = methodMeta[key], cfg = methodSettings[key];
    const item = document.createElement('div');
    item.className = 'method-item';
    item.innerHTML = `
      <div class="method-meta">
        <div class="method-name">${meta.name}</div>
        <div class="method-desc">${meta.desc}</div>
      </div>
      <div class="method-controls">
        <div class="weight-box">
          <span class="weight-label">Bobot</span>
          <input type="number" min="0" max="10" step="0.1" value="${cfg.weight}" data-weight="${key}">
        </div>
        <label class="switch">
          <input type="checkbox" data-method="${key}" ${cfg.enabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>`;
    grid.appendChild(item);
  });
  grid.querySelectorAll('input[data-method]').forEach(input => {
    input.addEventListener('change', e => {
      const key = e.target.dataset.method;
      methodSettings[key].enabled = e.target.checked;
      saveMethodSettings(); refreshAll();
      showToast(`${methodMeta[key].name} ${e.target.checked ? 'ON' : 'OFF'}`, 'info');
    });
  });
  grid.querySelectorAll('input[data-weight]').forEach(input => {
    input.addEventListener('change', e => {
      const key = e.target.dataset.weight;
      const num = clampWeight(parseFloat(e.target.value));
      methodSettings[key].weight = Number.isFinite(num) ? num : defaultMethodSettings[key].weight;
      e.target.value = methodSettings[key].weight.toFixed(1).replace('.0', '');
      saveMethodSettings(); refreshAll();
      showToast(`Bobot ${methodMeta[key].name}: ${methodSettings[key].weight}`, 'win');
    });
  });
}

function buildMethodOnlySettings(methodKey) {
  const settings = cloneDefaultSettings();
  Object.keys(settings).forEach(k => {
    settings[k].enabled = false;
    settings[k].weight = 0;
  });
  settings[methodKey].enabled = true;
  settings[methodKey].weight = defaultMethodSettings[methodKey].weight;
  return settings;
}
function buildMixSettings(keys) {
  const settings = cloneDefaultSettings();
  Object.keys(settings).forEach(k => {
    settings[k].enabled = keys.includes(k);
    settings[k].weight = keys.includes(k) ? defaultMethodSettings[k].weight : 0;
  });
  return settings;
}
function backtestSettings(settings) {
  let sample = 0, correct = 0;
  for (let i = 3; i < history.length; i++) {
    const arr = history.slice(0, i);
    const pred = predictWithSettings(arr, settings);
    if (!pred) continue;
    sample++;
    if (pred.outcome === history[i].result) correct++;
  }
  const accuracy = sample ? correct / sample : 0;
  const score = sample ? (accuracy * 0.85 + Math.min(sample / Math.max(history.length - 3, 1), 1) * 0.15) : 0;
  return { sample, correct, accuracy, score };
}
function computeRecommendations() {
  if (history.length < 8) return null;
  const methodKeys = Object.keys(methodMeta);
  const singles = methodKeys.map(key => {
    const perf = backtestSettings(buildMethodOnlySettings(key));
    return { type: 'single', keys: [key], ...perf };
  }).filter(x => x.sample >= 3).sort((a,b) => b.score - a.score || b.accuracy - a.accuracy || b.sample - a.sample);

  const candidateKeys = singles.slice(0, 7).map(x => x.keys[0]);
  const mixes = [];
  for (let size = 2; size <= 4; size++) {
    const combs = combinations(candidateKeys, size);
    combs.forEach(keys => {
      const perf = backtestSettings(buildMixSettings(keys));
      if (perf.sample >= 3) mixes.push({ type: 'mix', keys, ...perf });
    });
  }
  mixes.sort((a,b) => b.score - a.score || b.accuracy - a.accuracy || b.sample - a.sample);
  return { singles, mixes, bestSingle: singles[0] || null, bestMix: mixes[0] || null };
}
function combinations(arr, k) {
  const out = [];
  function rec(start, path) {
    if (path.length === k) { out.push([...path]); return; }
    for (let i = start; i < arr.length; i++) { path.push(arr[i]); rec(i + 1, path); path.pop(); }
  }
  rec(0, []);
  return out;
}
function formatMethodNames(keys) { return keys.map(k => methodMeta[k].name).join(' + '); }

function updateRecommendations() {
  recommendationCache = computeRecommendations();
  const bestSingle = document.getElementById('bestSingle');
  const bestSingleMeta = document.getElementById('bestSingleMeta');
  const bestMix = document.getElementById('bestMix');
  const bestMixMeta = document.getElementById('bestMixMeta');
  const rankWrap = document.getElementById('methodRankWrap');

  if (!recommendationCache) {
    bestSingle.textContent = 'Belum cukup data.';
    bestSingleMeta.textContent = 'Minimal sekitar 8 ronde agar rekomendasi lebih masuk akal.';
    bestMix.textContent = 'Belum cukup data.';
    bestMixMeta.textContent = 'Tambahkan histori agar sistem bisa membandingkan kombinasi.';
    rankWrap.innerHTML = '<div class="rec-muted">Belum ada ranking.</div>';
    return;
  }

  const s = recommendationCache.bestSingle;
  const m = recommendationCache.bestMix;

  bestSingle.innerHTML = s ? `<span class="badge-rank">TOP 1</span> ${formatMethodNames(s.keys)}` : 'Belum ada.';
  bestSingleMeta.textContent = s ? `Akurasi ${pct(s.accuracy)} · Benar ${s.correct}/${s.sample} sampel backtest.` : 'Belum ada.';
  bestMix.innerHTML = m ? `<span class="badge-rank">TOP MIX</span> ${formatMethodNames(m.keys)}` : 'Belum ada.';
  bestMixMeta.textContent = m ? `Akurasi ${pct(m.accuracy)} · Benar ${m.correct}/${m.sample} sampel backtest.` : 'Belum ada.';

  const rows = recommendationCache.singles.slice(0, 5).map((row, idx) =>
    `<tr><td>${idx + 1}</td><td>${formatMethodNames(row.keys)}</td><td>${pct(row.accuracy)}</td><td>${row.correct}/${row.sample}</td></tr>`
  ).join('');
  rankWrap.innerHTML = `<table class="rank-table"><thead><tr><th>#</th><th>Metode</th><th>Akurasi</th><th>Benar</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function applyRecommendedSingle() {
  if (!recommendationCache || !recommendationCache.bestSingle) return showToast('Belum ada rekomendasi single.', 'info');
  const key = recommendationCache.bestSingle.keys[0];
  methodSettings = buildMethodOnlySettings(key);
  saveMethodSettings(); refreshAll();
  showToast(`Best single diterapkan: ${methodMeta[key].name}`, 'win');
}
function applyRecommendedMix() {
  if (!recommendationCache || !recommendationCache.bestMix) return showToast('Belum ada rekomendasi mix.', 'info');
  const keys = recommendationCache.bestMix.keys;
  methodSettings = buildMixSettings(keys);
  saveMethodSettings(); refreshAll();
  showToast(`Best mix diterapkan.`, 'win');
}

function refreshAll() {
  updatePrediction();
  updateStats();
  updateTable();
  updateBoard();
  renderSettings();
  updateRecommendations();
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
    rows.push({ left, right });
  });
  return rows;
}
function buildContextSignatureFromArray(arr, index) {
  const curr = arr[index];
  if (!curr) return null;
  const prev = arr[index - 1];
  const d = Math.abs(curr.left - curr.right);
  const diff = d === 0 ? '0' : d <= 2 ? '1-2' : d <= 5 ? '3-5' : '6-9';
  const trend = prev ? (() => {
    const c = Math.abs(curr.left - curr.right), p = Math.abs(prev.left - prev.right);
    return c > p ? 'up' : c < p ? 'down' : 'flat';
  })() : 'none';
  const pairType = (() => {
    const side = curr.left > curr.right ? 'L' : curr.right > curr.left ? 'R' : 'D';
    const levelL = curr.left <= 3 ? 'S' : curr.left <= 6 ? 'M' : 'B';
    const levelR = curr.right <= 3 ? 'S' : curr.right <= 6 ? 'M' : 'B';
    return `${parity(curr.left)}${parity(curr.right)}|${levelL}${levelR}|${side}|${diff}`;
  })();
  return [curr.result, `${parity(curr.left)}${parity(curr.right)}`, diff, trend, prev ? prev.result : 'none', pairType].join('|');
}
function predictFromArray(arr) {
  const old = history;
  history = arr;
  const result = predict();
  history = old;
  return result;
}
function rebuildHistoryEntries(baseRows, append=true) {
  const source = append ? history.slice() : [];
  baseRows.forEach(pair => {
    const pred = source.length >= 3 ? predictFromArray(source) : null;
    const result = getOutcome(pair.left, pair.right);
    source.push({ left: pair.left, right: pair.right, result, prediction: pred ? pred.outcome : '—', ts: Date.now() + source.length, contextKey: null });
    source[source.length - 1].contextKey = buildContextSignatureFromArray(source, source.length - 1);
  });
  history = source;
}

document.getElementById('submitBtn').addEventListener('click', () => {
  const lv = document.getElementById('inputLeft').value.trim(), rv = document.getElementById('inputRight').value.trim();
  if (lv === '' || rv === '') return showToast('Isi kedua angka terlebih dahulu!', 'info');
  const left = parseInt(lv, 10), right = parseInt(rv, 10);
  if ([left, right].some(n => Number.isNaN(n) || n < 0 || n > 9)) return showToast('Angka harus 0 sampai 9.', 'info');
  document.getElementById('dispLeft').textContent = left;
  document.getElementById('dispRight').textContent = right;
  const result = getOutcome(left, right), prediction = lastPrediction ? lastPrediction.outcome : '—';
  history.push({ left, right, result, prediction, ts: Date.now(), contextKey: null });
  history[history.length - 1].contextKey = buildContextSignature(history.length - 1);
  saveHistory(); refreshAll();
  if (prediction !== '—') showToast(prediction === result ? 'Prediksi Tepat!' : 'Prediksi Meleset', prediction === result ? 'win' : 'info');
  document.getElementById('inputLeft').value = ''; document.getElementById('inputRight').value = ''; document.getElementById('inputLeft').focus();
});
['inputLeft','inputRight'].forEach(id => {
  document.getElementById(id).addEventListener('input', e => {
    document.getElementById(id === 'inputLeft' ? 'dispLeft' : 'dispRight').textContent = e.target.value !== '' ? e.target.value : '–';
  });
  document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('submitBtn').click(); });
});

document.getElementById('btnExport').addEventListener('click', () => {
  if (!history.length) return showToast('Tidak ada data untuk diexport.', 'info');
  const header = ['Ronde','Kiri','Kanan','Hasil','Prediksi','Tepat','Timestamp'];
  const rows = history.map((r, i) => [i+1, r.left, r.right, label(r.result), r.prediction === '—' ? '' : label(r.prediction), r.prediction === '—' ? '' : (r.prediction === r.result ? 'Ya' : 'Tidak'), new Date(r.ts).toLocaleString('id-ID')]);
  const csv = [header, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = `predictor_export_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
  showToast('CSV berhasil diexport.', 'win');
});
document.getElementById('btnClear').addEventListener('click', () => {
  if (!confirm('Reset semua riwayat?')) return;
  history = []; saveHistory(); refreshAll();
  document.getElementById('dispLeft').textContent = '–'; document.getElementById('dispRight').textContent = '–';
  showToast('Riwayat direset.', 'info');
});
document.getElementById('importFile').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  const text = await file.text(); const rows = parseImportText(text);
  if (!rows.length) return showToast('File tidak berisi format angka yang valid.', 'info');
  rebuildHistoryEntries(rows, true); saveHistory(); refreshAll();
  showToast(`${rows.length} ronde berhasil diimport.`, 'win'); e.target.value = '';
});

document.getElementById('btnAllOn').addEventListener('click', () => { Object.keys(methodSettings).forEach(k => methodSettings[k].enabled = true); saveMethodSettings(); refreshAll(); showToast('Semua metode diaktifkan.', 'win'); });
document.getElementById('btnAllOff').addEventListener('click', () => { Object.keys(methodSettings).forEach(k => methodSettings[k].enabled = false); saveMethodSettings(); refreshAll(); showToast('Semua metode dimatikan.', 'info'); });
document.getElementById('btnDefault').addEventListener('click', () => { methodSettings = cloneDefaultSettings(); saveMethodSettings(); refreshAll(); showToast('Default metode dipulihkan.', 'win'); });
document.getElementById('btnWeightDefault').addEventListener('click', () => { Object.keys(methodSettings).forEach(k => methodSettings[k].weight = defaultMethodSettings[k].weight); saveMethodSettings(); refreshAll(); showToast('Bobot default dipulihkan.', 'win'); });
document.getElementById('btnApplyBestSingle').addEventListener('click', applyRecommendedSingle);
document.getElementById('btnApplyBestMix').addEventListener('click', applyRecommendedMix);

function handleLogin() {
  const u = document.getElementById('loginUser').value.trim(), p = document.getElementById('loginPass').value;
  const found = AUTH_USERS.find(x => x.username === u && x.password === p);
  const error = document.getElementById('loginError');
  if (!found) { error.textContent = 'Username atau password salah.'; return; }
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username: found.username, role: found.role }));
  document.getElementById('loginOverlay').style.display = 'none'; error.textContent = ''; showToast('Login berhasil.', 'win');
}
document.getElementById('loginBtn').addEventListener('click', handleLogin);
document.getElementById('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem(SESSION_KEY); document.getElementById('loginOverlay').style.display = 'flex'; showToast('Logout berhasil.', 'info');
});
function bootSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY); if (!raw) return;
    const session = JSON.parse(raw); if (session && session.username) document.getElementById('loginOverlay').style.display = 'none';
  } catch (e) {}
}

loadHistory();
bootSession();
refreshAll();
