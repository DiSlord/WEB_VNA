const VNA_MATH = {
 Z0: 50.0,

 // Вспомогательная: |S|^2
 _l: (re, im) => (re * re + im * im),
 // LINEAR = |S|
 linear: (s) => Math.sqrt(VNA_MATH._l(s.re, s.im)),

 // LOGMAG = 20 * log10(|S|)
 logmag: (s) => 20 * Math.log10(VNA_MATH.linear(s)),

 // PHASE = atan2(im, re) * 180 / PI
 phase: (s) => Math.atan2(s.im, s.re) * 180 / Math.PI,

 // REAL
 real: (s) => s.re,

 // IMAG
 imag: (s) => s.im,

 // SWR = (1 + |S|) / (1 - |S|)
 swr: (s) => { const x = VNA_MATH.linear(s); return x > 0.99 ? Infinity : (1.0 + x) / (1.0 - x); },

 // RESISTANCE (R) = |2 * Z0 * (1 - re) / ((1 - re)^2 + (-im)^2) - Z0|
 resistance: (s) => {
   const re = 1.0 - s.re, im = -s.im;
   const l = VNA_MATH._l(re, im);
   return l === 0 ? 0 : Math.abs(2 * VNA_MATH.Z0 * re / l - VNA_MATH.Z0);
 },

 // REACTANCE (X) = -2 * Z0 * (-im) / ((1 - re)^2 + (-im)^2)
 reactance: (s) => {
   const re = 1.0 - s.re, im = -s.im;
   const l = VNA_MATH._l(re, im);
   return l === 0 ? 0 : -2 * VNA_MATH.Z0 * im / l;
 },

 // |Z| = Z0 * sqrt( ((1 + re)^2 + im^2) / ((1 - re)^2 + im^2) )
 mod_z: (s) => {
   const num = VNA_MATH._l(1.0 + s.re, s.im);
   const den = VNA_MATH._l(1.0 - s.re, s.im);
   return den === 0 ? Infinity : VNA_MATH.Z0 * Math.sqrt(num / den);
 },

 // Z PHASE = atan2(2 * im, 1 - (re^2 + im^2)) * 180 / PI
 phase_z: (s) => {
   const r = 1.0 - VNA_MATH._l(s.re, s.im);
   const x = 2.0 * s.im;
   return Math.atan2(x, r) * 180 / Math.PI;
 },

 // SERIES C = -1 / (w * X)
 series_c: (s, freq) => {
   const zi = VNA_MATH.reactance(s);
   const w = 2 * Math.PI * freq;
   return zi === 0 || w === 0 ? 0 : -1.0 / (w * zi);
 },

 // SERIES L = X / w
 series_l: (s, freq) => {
   const zi = VNA_MATH.reactance(s);
   const w = 2 * Math.PI * freq;
   return w === 0 ? 0 : zi / w;
 },

 // CONDUCTANCE (G) = |2 * (1/Z0) * (1 + re) / ((1 + re)^2 + im^2) - (1/Z0)|
 conductance: (s) => {
   const z0_inv = 1.0 / VNA_MATH.Z0;
   const re = 1.0 + s.re, im = s.im;
   const l = VNA_MATH._l(re, im);
   return l === 0 ? 0 : Math.abs(2 * z0_inv * re / l - z0_inv);
 },

 // SUSCEPTANCE (B) = -2 * (1/Z0) * im / ((1 + re)^2 + im^2)
 susceptance: (s) => {
   const z0_inv = 1.0 / VNA_MATH.Z0;
   const re = 1.0 + s.re, im = s.im;
   const l = VNA_MATH._l(re, im);
   return l === 0 ? 0 : -2 * z0_inv * im / l;
 },

 // PARALLEL R = 1 / G
 parallel_r: (s) => {
   const g = VNA_MATH.conductance(s);
   return g === 0 ? Infinity : 1.0 / g;
 },

 // PARALLEL X = -1 / B
 parallel_x: (s) => {
   const b = VNA_MATH.susceptance(s);
   return b === 0 ? Infinity : -1.0 / b;
 },

 // PARALLEL C = B / w
 parallel_c: (s, freq) => {
   const yi = VNA_MATH.susceptance(s);
   const w = 2 * Math.PI * freq;
   return w === 0 ? 0 : yi / w;
 },

 // PARALLEL L = Xp / w
 parallel_l: (s, freq) => {
   const xp = VNA_MATH.parallel_x(s);
   const w = 2 * Math.PI * freq;
   return w === 0 ? 0 : xp / w;
 },

 // |Y| = 1 / |Z|
 mod_y: (s) => {
   const z = VNA_MATH.mod_z(s);
   return z === 0 ? Infinity : 1.0 / z;
 },

 // Q FACTOR = |2 * im / (1 - (re^2 + im^2))|
 qualityfactor: (s) => {
   const r = 1.0 - VNA_MATH._l(s.re, s.im);
   const x = 2.0 * s.im;
   return r === 0 ? Infinity : Math.abs(x / r);
 },

 // --- S21 Specific Calculations ---
 // S21 SERIES R = 2 * Z0 * re / (re^2 + im^2) - 2 * Z0
 s21series_r: (s) => {
   const l = VNA_MATH._l(s.re, s.im);
   return l === 0 ? 0 : (2 * VNA_MATH.Z0 * s.re / l) - (2 * VNA_MATH.Z0);
 },

 // S21 SERIES X = -2 * Z0 * im / (re^2 + im^2)
 s21series_x: (s) => {
   const l = VNA_MATH._l(s.re, s.im);
   return l === 0 ? 0 : -2 * VNA_MATH.Z0 * s.im / l;
 },

 // S21 SERIES |Z| = 2 * Z0 * sqrt( ((1 - re)^2 + im^2) / (re^2 + im^2) )
 s21series_z: (s) => {
   const num = VNA_MATH._l(1.0 - s.re, s.im);
   const den = VNA_MATH._l(s.re, s.im);
   return den === 0 ? Infinity : 2 * VNA_MATH.Z0 * Math.sqrt(num / den);
 },

 // S21 SHUNT R = 0.5 * Z0 * (1 - re) / ((1 - re)^2 + (-im)^2) - 0.5 * Z0
 s21shunt_r: (s) => {
   const re = 1.0 - s.re;
   const im = -s.im;
   const l = VNA_MATH._l(re, im);
   return l === 0 ? 0 : (0.5 * VNA_MATH.Z0 * re / l) - (0.5 * VNA_MATH.Z0);
 },

 // S21 SHUNT X = -0.5 * Z0 * (-im) / ((1 - re)^2 + (-im)^2)
 s21shunt_x: (s) => {
   const re = 1.0 - s.re;
   const im = -s.im;
   const l = VNA_MATH._l(re, im);
   return l === 0 ? 0 : -0.5 * VNA_MATH.Z0 * im / l; // -(-im) = +im
 },

 // S21 SHUNT |Z| = 0.5 * Z0 * sqrt( (re^2 + im^2) / ((1 - re)^2 + im^2) )
 s21shunt_z: (s) => {
   const num = VNA_MATH._l(s.re, s.im);
   const den = VNA_MATH._l(1.0 - s.re, s.im);
   return den === 0 ? Infinity : 0.5 * VNA_MATH.Z0 * Math.sqrt(num / den);
 },

 // S21 Q FACTOR = |im / (re - (re^2 + im^2))|
 s21_qualityfactor: (s) => {
   const den = s.re - VNA_MATH._l(s.re, s.im);
   return den === 0 ? Infinity : Math.abs(s.im / den);
 },

 // GROUP DELAY = atan2(w_re*v_im - w_im*v_re, w_re*v_re + w_im*v_im) / (360 * delta_f)
 groupdelay: (data, i, freqs) => {
   if (!data || !freqs || i < 0 || i >= data.length) return 0;
   const prev = Math.max(0, i - 1), next = Math.min(data.length - 1, i + 1);
   const v = data[prev], w = data[next];
   const r = w.re * v.re + w.im * v.im;
   const im_val = w.re * v.im - w.im * v.re;

   const delta_f = freqs[next] - freqs[prev];
   if (delta_f === 0) return 0;
   return Math.atan2(im_val, r) / (2 * Math.PI * delta_f);
 }
};

/**
 * Универсальный бинарный поиск диапазона для интерполяции.
 * Работает за O(log N).
 * 
 * @param {Array} points - Отсортированный массив объектов
 * @param {number} target - Искомое значение
 * @param {string} key - Ключ для сравнения (по умолчанию 'freq')
 * @returns {Object|null} { left: индекс_большего, right: индекс_меньшего } 
 *                        или { left: idx, right: idx } при точном совпадении.
 *                        Возвращает null, если массив пуст.
 */
function findInterpolationRange(points, target, key = 'freq') {
  if (!points || points.length === 0) return null;
  const firstVal = points[0][key];
  const lastVal = points[points.length - 1][key];
  if (target <= firstVal) return { left: 0, right: 0 };
  if (target >= lastVal) return { left: points.length - 1, right: points.length - 1 };
  let left = 0;
  let right = points.length - 1;
  while (left <= right) {
    const mid = (left + right) >> 1; // Быстрое деление на 2
    const midVal = points[mid][key];
    if (midVal === target) return { left: mid, right: mid };
    if (midVal < target) left = mid + 1;
    else right = mid - 1;
  }
  return { left, right };
}

/**
 * Универсальная функция линейной интерполяции точки по частоте.
 * Использует гибридный подход: быстрая математическая оценка для линейных данных,
 * fallback на бинарный поиск для нелинейных/неравномерных данных.
 */
function interpolatePoint(points, targetFreq) {
  if (!points || points.length === 0) return null;
  if (points.length === 1) return Math.abs(points[0].freq - targetFreq) < 1 ? { ...points[0] } : null;

  const firstFreq = points[0].freq;
  const lastFreq = points[points.length - 1].freq;

  if (targetFreq <= firstFreq) return Math.abs(firstFreq - targetFreq) < 1 ? { ...points[0] } : null;
  if (targetFreq >= lastFreq) return Math.abs(lastFreq - targetFreq) < 1 ? { ...points[points.length - 1] } : null;

  const span = lastFreq - firstFreq;
  const idx = Math.max(0, Math.min(Math.floor(((targetFreq - firstFreq) / span) * (points.length - 1)), points.length - 2));
  let pL = points[idx];
  let pR = points[idx + 1];

  if (targetFreq < pL.freq || targetFreq > pR.freq) { // not hit
    const range = findInterpolationRange(points, targetFreq, 'freq');
    if (!range) return null;
    pL = points[range.right]; // Точка с частотой < targetFreq
    pR = points[range.left];  // Точка с частотой > targetFreq
  }
  const deltaFreq = pR.freq - pL.freq;
  if (deltaFreq === 0) return { ...pL };
  const t = (targetFreq - pL.freq) / deltaFreq;
  const x = pL.x + t * (pR.x - pL.x);
  const y = pL.y + t * (pR.y - pL.y);
  if (typeof pL.value === 'object') {
    const v = {
      re: pL.value.re + t * (pR.value.re - pL.value.re),
      im: pL.value.im + t * (pR.value.im - pL.value.im)
    };
    return {...pL, freq: targetFreq, x: x, y: y, value: v };
  }
  const v = pL.value + t * (pR.value - pL.value);
  return {...pL, freq: targetFreq, x: x, y: y, value: v };
}

const BIG_PREFIXES = ['k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
const SMALL_PREFIXES = ['m', 'µ', 'n', 'p', 'f', 'a', 'z', 'y'];

/**
 * Форматирует число с автоматическим подбором метрического префикса
 * @param {number} value - Значение
 * @param {number} precision - Базовая точность (кол-во знаков после запятой)
 * @param {string} suffix - Единица измерения (Ω, F, H, s и т.д.)
 * @param {boolean} usePrefix - Применять ли префиксы (k, M, m, µ, n)
 */
function formatValue(value, type = {}, im = false) {
  const decimals  = type.decimals  ?? 3;
  const suffix    = type.suffix    ?? '';
  const usePrefix = type.usePrefix ?? false;
  const adjustPrecision = type.adjustPrecision ?? true;
  if (value === undefined || value === null || !isFinite(value)) return '∞' + (suffix ? ' ' + suffix : '');
  if (value === 0) return '0' + (suffix ? ' ' + suffix : '');
  let sign = im ? (value < 0 ? '- j' : '+ j') : (value < 0 ? '-' : '');

  let absVal = Math.abs(value);
  let prefix = '';
  if (usePrefix) {
    if (absVal >= 1) for (let i = 0; absVal >= 1000 && i < BIG_PREFIXES.length; i++) { absVal /= 1000; prefix = BIG_PREFIXES[i]; }
    else             for (let i = 0; absVal <     1 && i < SMALL_PREFIXES.length; i++){ absVal *= 1000; prefix = SMALL_PREFIXES[i]; }
  }
  let adjDecimals = decimals;
  if (adjustPrecision) {
    if (usePrefix && prefix) adjDecimals--;
    const intPart = Math.floor(absVal);
    if (intPart >= 100) adjDecimals -= 2;
    else if (intPart >= 10) adjDecimals -= 1;
    if (adjDecimals < 0) adjDecimals = 0;
  }

  let formatted = absVal.toFixed(adjDecimals);
  formatted = formatted.replace(/\.?0+$/, '');
  return sign + formatted + prefix + suffix;
}

function formatSmithValue(value, type = {}) {
  return `${formatValue(value.re, type)} ${formatValue(value.im, type, true)}`;
}

function getValue(text) {
  if (typeof text !== 'string') return NaN;
  text = text.trim().replace(',', '.');
  const match = text.match(/^([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)[\s\d]*([a-zA-Zµ])?/);
  if (!match) return NaN;
  const num = parseFloat(match[1]);
  const prefix = match[2];
  if (!prefix) return num;
  const normalizedPrefix = (prefix === 'u') ? 'µ' : prefix;
  const bigIdx = BIG_PREFIXES.indexOf(normalizedPrefix);
  if (bigIdx >= 0) return num * Math.pow(10, (bigIdx + 1) * 3);
  const smallIdx = SMALL_PREFIXES.indexOf(normalizedPrefix);
  if (smallIdx >= 0) return num * Math.pow(10, -(smallIdx + 1) * 3);
  return NaN;
}

/**
 * Форматирует частоту с автоматическим подбором префикса
 * @param {number} freq      – частота в Гц
 * @param {number} precision – кол-во знаков после запятой; если 0 – формат "1.234 567 890 G"
 * @returns {string} отформатированная строка
 */
const MAX_FREQ_PRECISION = 14;
function formatFreqValue(freq, precision = 0) {
  if (freq === 0) return '0';
  const sign = freq < 0 ? '-' : '';
  const absFreq = Math.abs(Math.round(freq));
  const str = absFreq.toString();
  const prefixIndex = Math.min(Math.floor((str.length - 1) / 3), BIG_PREFIXES.length - 1);
  const prefix = BIG_PREFIXES[prefixIndex-1] || '';
  let formatted = str.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (formatted.includes(' ')) formatted = formatted.replace(' ', '.');

  if (precision !== 0) {
    const effPrec = Math.min(precision, MAX_FREQ_PRECISION);
    const divider = Math.pow(1000, prefixIndex);
    const numValue = absFreq / divider;
    formatted = Number(numValue.toFixed(effPrec)).toString();
  }
  return sign + formatted + ' ' + prefix + 'Hz';
}

/**
 * Генерирует "красивые" значения для шкалы (1, 2, 2.5, 5, 10 и их степени)
 * @param {number} min - Минимальное значение диапазона
 * @param {number} max - Максимальное значение диапазона
 * @param {number} minPixelSpacing - Минимальное расстояние между линиями в пикселях
 * @param {number} totalPixels - Общая ширина или высота области в пикселях
 * @returns {Object} { ticks: number[], step: number }
 */
const nice = [1, 2, 2.5, 5, 10];
function getNiceTicks(min, max, minPixelSpacing, totalPixels) {
  if (min === max) return { ticks: [min], step: 1 };
  const range = max - min;
  const roughStep = range * minPixelSpacing / totalPixels;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;
  const step = (nice.find(n => normalized <= n) || nice[nice.length - 1]) * magnitude;
  const epsilon = step * 1e-9;
  const start = Math.ceil((min - epsilon) / step) * step;
  const end = Math.floor((max + epsilon) / step) * step;
  const ticks = [];
  for (let v = start; v <= end + epsilon; v += step) ticks.push(Number(v.toPrecision(12)));
  return { ticks, step };
}

const TRACE_TYPES = {
  // --- Общие для всех 4 каналов ---
  NONE:   { name: 'None',   suffix: '',   decimals: 3, channels: [],                           top: 1, bottom: 0, usePrefix: false, calc: null },
  LOGMAG: { name: 'LOGMAG', suffix: 'dB', decimals: 3, channels: ['S11', 'S21', 'S12', 'S22'], top: 0, bottom: -80, usePrefix: false, calc: (s) => VNA_MATH.logmag(s) },
  PHASE:  { name: 'PHASE',  suffix: '°',  decimals: 3, channels: ['S11', 'S21', 'S12', 'S22'], top: 90, bottom: -90, usePrefix: true, calc: (s) => VNA_MATH.phase(s) },
  DELAY:  { name: 'DELAY',  suffix: 's',  decimals: 4, channels: ['S11', 'S21', 'S12', 'S22'], top: 1e-9, bottom: -1e-9, usePrefix: true, calc: (s, i, freq, data, freqs) => VNA_MATH.groupdelay(data, i, freqs) },
  LINEAR: { name: 'LINEAR', suffix: '',   decimals: 4, channels: ['S11', 'S21', 'S12', 'S22'], top: 1, bottom: 0, usePrefix: true, calc: (s) => VNA_MATH.linear(s) },
  REAL:   { name: 'REAL',   suffix: '',   decimals: 6, channels: ['S11', 'S21', 'S12', 'S22'], top: 1, bottom: -1, usePrefix: true, calc: (s) => VNA_MATH.real(s) },
  IMAG:   { name: 'IMAG',   suffix: 'j',  decimals: 6, channels: ['S11', 'S21', 'S12', 'S22'], top: 1, bottom: -1, usePrefix: true, calc: (s) => VNA_MATH.imag(s) },

  SMITH:  { name: 'SMITH',  suffix: '',   decimals: 6, channels: ['S11', 'S22'], top: 1, bottom: -1, usePrefix: true, calc: (s) => s },
  POLAR:  { name: 'POLAR',  suffix: '',   decimals: 3, channels: ['S11', 'S21', 'S12', 'S22'], top: 1, bottom: -1, usePrefix: false, calc: (s) => s },

  // --- Отражение (S11, S22) ---
  SWR:    { name: 'SWR',       suffix: '',   decimals: 3, channels: ['S11', 'S22'], top: 5, bottom: 1, usePrefix: false, calc: (s) => VNA_MATH.swr(s) },
  R:      { name: 'RESISTANCE',suffix: 'Ω',  decimals: 3, channels: ['S11', 'S22'], top: 500, bottom: 0, usePrefix: true, calc: (s) => VNA_MATH.resistance(s) },
  X:      { name: 'REACTANCE', suffix: 'Ω',  decimals: 3, channels: ['S11', 'S22'], top: 500, bottom: -500, usePrefix: true, calc: (s) => VNA_MATH.reactance(s) },
  Z:      { name: '|Z|',       suffix: 'Ω',  decimals: 3, channels: ['S11', 'S22'], top: 500, bottom: 0, usePrefix: true, calc: (s) => VNA_MATH.mod_z(s) },
  ZPHASE: { name: 'Z PHASE',   suffix: '°',  decimals: 1, channels: ['S11', 'S22'], top: 90, bottom: -90, usePrefix: true, calc: (s) => VNA_MATH.phase_z(s) },
  CS:     { name: 'SERIES C',  suffix: 'F',  decimals: 4, channels: ['S11', 'S22'], top: 1e-9, bottom: -1e-9, usePrefix: true, calc: (s, i, freq) => VNA_MATH.series_c(s, freq) },
  LS:     { name: 'SERIES L',  suffix: 'H',  decimals: 4, channels: ['S11', 'S22'], top: 1e-8, bottom: -1e-8, usePrefix: true, calc: (s, i, freq) => VNA_MATH.series_l(s, freq) },
  RP:     { name: 'PARALLEL R',suffix: 'Ω',  decimals: 3, channels: ['S11', 'S22'], top: 1000, bottom: 0, usePrefix: true, calc: (s) => VNA_MATH.parallel_r(s) },
  XP:     { name: 'PARALLEL X',suffix: 'Ω',  decimals: 3, channels: ['S11', 'S22'], top: 1000, bottom: -1000, usePrefix: true, calc: (s) => VNA_MATH.parallel_x(s) },
  CP:     { name: 'PARALLEL C',suffix: 'F',  decimals: 4, channels: ['S11', 'S22'], top: 1e-9, bottom: -1e-9, usePrefix: true, calc: (s, i, freq) => VNA_MATH.parallel_c(s, freq) },
  LP:     { name: 'PARALLEL L',suffix: 'H',  decimals: 4, channels: ['S11', 'S22'], top: 1e-8, bottom: -1e-8, usePrefix: true, calc: (s, i, freq) => VNA_MATH.parallel_l(s, freq) },
  Q:      { name: 'Q FACTOR',  suffix: '',   decimals: 4, channels: ['S11', 'S22'], top: 100, bottom: 0, usePrefix: false, calc: (s) => VNA_MATH.qualityfactor(s) },
  G:      { name: 'CONDUCTANCE',suffix: 'S', decimals: 3, channels: ['S11', 'S22'], top: 0.1, bottom: 0, usePrefix: true, calc: (s) => VNA_MATH.conductance(s) },
  B:      { name: 'SUSCEPTANCE',suffix: 'S', decimals: 3, channels: ['S11', 'S22'], top: 0.1, bottom: -0.1, usePrefix: true, calc: (s) => VNA_MATH.susceptance(s) },
  Y:      { name: '|Y|',       suffix: 'S',  decimals: 3, channels: ['S11', 'S22'], top: 0.1, bottom: 0, usePrefix: true, calc: (s) => VNA_MATH.mod_y(s) },
  // --- Прохождение (S21, S12) ---
  RSER:   { name: 'SERIES R',  suffix: 'Ω',  decimals: 3, channels: ['S21', 'S12'], top: 500, bottom: -500, usePrefix: true, calc: (s) => VNA_MATH.s21series_r(s) },
  XSER:   { name: 'SERIES X',  suffix: 'Ω',  decimals: 3, channels: ['S21', 'S12'], top: 500, bottom: -500, usePrefix: true, calc: (s) => VNA_MATH.s21series_x(s) },
  ZSER:   { name: 'SERIES |Z|',suffix: 'Ω',  decimals: 3, channels: ['S21', 'S12'], top: 500, bottom: 0, usePrefix: true, calc: (s) => VNA_MATH.s21series_z(s) },
  RSH:    { name: 'SHUNT R',   suffix: 'Ω',  decimals: 3, channels: ['S21', 'S12'], top: 250, bottom: -250, usePrefix: true, calc: (s) => VNA_MATH.s21shunt_r(s) },
  XSH:    { name: 'SHUNT X',   suffix: 'Ω',  decimals: 3, channels: ['S21', 'S12'], top: 250, bottom: -250, usePrefix: true, calc: (s) => VNA_MATH.s21shunt_x(s) },
  ZSH:    { name: 'SHUNT |Z|', suffix: 'Ω',  decimals: 3, channels: ['S21', 'S12'], top: 250, bottom: 0, usePrefix: true, calc: (s) => VNA_MATH.s21shunt_z(s) },
  QS21:   { name: 'Q FACTOR',  suffix: '',   decimals: 4, channels: ['S21', 'S12'], top: 100, bottom: 0, usePrefix: false, calc: (s) => VNA_MATH.s21_qualityfactor(s) }
};