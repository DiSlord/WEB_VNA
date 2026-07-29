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

 // RESISTANCE (R) = Z0 * |Γ|² / |1 - Γ|²
 resistance: (s) => {
   const mag2 = VNA_MATH._l(s.re, s.im);      // |Γ|²
   const denom = VNA_MATH._l(1 - s.re,  s.im);// |1 - Γ|²
   return denom === 0 ? 0 : VNA_MATH.Z0 * (1 - mag2) / denom;
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
   return l === 0 ? 0 : 2 * z0_inv * re / l - z0_inv;
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

const MAX_FREQ_PRECISION = 14;
function _formatFreq(absFreq, precision) {
  if (absFreq === 0) return '0';
  absFreq = Math.round(absFreq);
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
  return formatted + ' ' + prefix;
}

function _formatFloat(absVal, precision) {
  return absVal.toFixed(precision).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

function _formatPFloat(absVal, precision) {
  if (absVal === 0) return '0';
  let prefix = '';
  if (absVal >= 1) for (let i = 0; absVal >= 1000 && i < BIG_PREFIXES.length; i++) { absVal /= 1000; prefix = BIG_PREFIXES[i]; }
  else             for (let i = 0; absVal <     1 && i < SMALL_PREFIXES.length; i++){ absVal *= 1000; prefix = SMALL_PREFIXES[i]; }
  let adjDecimals = precision > 0 ? precision : 3;
  if (prefix) adjDecimals--;
  const intPart = Math.floor(absVal);
  if (intPart >= 100) adjDecimals -= 2;
  else if (intPart >= 10) adjDecimals -= 1;
  if (adjDecimals < 0) adjDecimals = 0;
  return _formatFloat(absVal, adjDecimals) + prefix;
}

/**
 * Универсальная функция форматирования чисел
 * Синтаксис: %[flags][width][.precision]type
 * Флаги:
 *   '+' - всегда показывать знак (+/-)
 *   ' ' - пробел для положительных чисел
 *   'j' - комплексное число (добавляет ' j' после знака)
 * Типы:
 *   d/i/u - целые (десятичные)
 *   x/X   - шестнадцатеричные
 *   o     - восьмеричные
 *   b     - двоичные
 *   f     - float без префикса
 *   F     - float с SI-префиксом (k, M, G, m, µ, n...)
 *   q     - частота с авто-префиксом
 * @param {string} formatStr - Строка формата
 * @param {...number} values - Значения для подстановки
 * @returns {string} Отформатированная строка
 */
function formatValue(formatStr, ...values) {
  if (typeof formatStr !== 'string') return String(values[0] ?? '');
  let idx = 0;
  return formatStr.replace(/%([-+ j]*)(\d*)(?:\.(\d*))?(?:h|l|L)?([dFqfxXUuob])/g, (match, flags, width, precision, type) => {
    const value = values[idx++];
    if (value === undefined || value === null || typeof value !== 'number') return 'NaN';
    const hasPlus = flags.includes('+');
    const hasSpace = flags.includes(' ');
    const isNegative = value < 0;
    let sign = isNegative ? '-' : hasPlus ? '+' : hasSpace ? ' ' : '';
    if (flags.includes('j')) sign+= ' j';
    if (!isFinite(value)) return sign + '∞';
    const p = parseInt(precision, 10) || 0;
    const absVal = Math.abs(value);
    let str;
    switch (type) {
      case 'q': str = _formatFreq(absVal, p); break;           // Частота (как formatFreqValue)
      case 'F': str = _formatPFloat(absVal, p); break;         // Float с SI-префиксом
      case 'f': str = _formatFloat(absVal, p); break         ; // Float без префикса
      case 'd':
      case 'i': str = Math.round(absVal).toString(10); break;  // Знаковое десятичное
      case 'u': str = Math.round(absVal).toString(10); break;  // Беззнаковое десятичное
      case 'x': str = Math.round(absVal).toString(16); break;  // Шестнадцатеричное (нижний регистр)
      case 'X': str = Math.round(absVal).toString(16).toUpperCase(); break; // Шестнадцатеричное (верхний регистр)
      case 'o': str = Math.round(absVal).toString(8); break;   // Восьмеричное
      case 'b': str = Math.round(absVal).toString(2); break;   // Двоичное
      default:  str = String(absVal);
    }
    str = sign + str;
/*
    const w = parseInt(width, 10) || 0;
    const isLeftAlign = flags.includes('-');
    if (w > 0 && str.length < w) str = (isLeftAlign) ? str.padEnd(w, ' ') : str.padStart(w, ' ');
*/
    return str;
  });
}

function getValue(text) {
  if (typeof text !== 'string') return NaN;
  text = text.trim().replace(',', '.').replace(/\s+/g, '')
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

function formatFreqValue(freq, precision = 0) {
  return formatValue(`%.${precision}qHz`, freq);
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
  const stepOrder = Math.floor(Math.log10(step));
  const precision = Math.max(0, -stepOrder + 1); // +1 для запаса
  const epsilon = step * 1e-9;
  const start = Math.ceil((min - epsilon) / step) * step;
  const end = Math.floor((max + epsilon) / step) * step;
  
  const ticks = [];
  for (let i = 0; ; i++) {
    const v = start + i * step;
    if (v > end + epsilon) break;
    ticks.push(Number(v.toFixed(precision)));
  }
  return { ticks, step };
}

// Битовые маски каналов
const CH_S11 = 1;  // 0001
const CH_S21 = 2;  // 0010
const CH_S12 = 4;  // 0100
const CH_S22 = 8;  // 1000

const CH_ALL = CH_S11 | CH_S21 | CH_S12 | CH_S22;
const CH_REFLECT = CH_S11 | CH_S22;
const CH_THRU = CH_S21 | CH_S12;
const CH_PORT1 = CH_S11 | CH_S21;
const CH_PORT2 = CH_S22 | CH_S12;

function getChannelList(mask) {
  const list = [];
  if (mask & CH_S11) list.push('S11');
  if (mask & CH_S21) list.push('S21');
  if (mask & CH_S12) list.push('S12');
  if (mask & CH_S22) list.push('S22');
  return list;
}

const TRACE_TYPES = {
  // --- Общие для всех 4 каналов ---
//  NONE:   { name: 'None',   f: 'none',   valid: 0},
  LOGMAG: { name: 'LOGMAG', f: '%.3fdB', valid: CH_ALL, top  : 0, bottom:  -80, calc: (s) => VNA_MATH.logmag(s) },
  PHASE:  { name: 'PHASE',  f: '%.3F°',  valid: CH_ALL, top :180, bottom: -180, calc: (s) => VNA_MATH.phase(s) },
  DELAY:  { name: 'DELAY',  f: '%.4Fs',  valid: CH_ALL, top:1e-6, bottom:-1e-6, calc: (s, i, freq, data, freqs) => VNA_MATH.groupdelay(data, i, freqs) },
  LINEAR: { name: 'LINEAR', f: '%.4F',   valid: CH_ALL, top:   1, bottom:    0, calc: (s) => VNA_MATH.linear(s), min: 0, },
  REAL:   { name: 'REAL',   f: '%.6F',   valid: CH_ALL, top:   1, bottom:   -1, calc: (s) => VNA_MATH.real(s) },
  IMAG:   { name: 'IMAG',   f: '%.6F',   valid: CH_ALL, top:   1, bottom:   -1, calc: (s) => VNA_MATH.imag(s) },

  // --- Отражение (S11, S22) ---
  SMITH1: { name: 'SMITH Refl', f: '%.6F',  valid: CH_REFLECT, top:   1, bottom:   -1, calc: (s) => s, rad: 1},
  POLAR1: { name: 'POLAR Refl', f: '%.3F',  valid: CH_REFLECT, top:   1, bottom:   -1, calc: (s) => s, rad: 2},
  SWR:    { name: 'SWR',        f: '%.3F',  valid: CH_REFLECT, top:   5, bottom:    1, calc: (s) => VNA_MATH.swr(s), min: 1 },
  R:      { name: 'RESISTANCE', f: '%.3FΩ', valid: CH_REFLECT, top: 500, bottom:    0, calc: (s) => VNA_MATH.resistance(s) },
  X:      { name: 'REACTANCE',  f: '%.3FΩ', valid: CH_REFLECT, top: 500, bottom: -500, calc: (s) => VNA_MATH.reactance(s) },
  Z:      { name: '|Z|',        f: '%.3FΩ', valid: CH_REFLECT, top: 500, bottom:    0, calc: (s) => VNA_MATH.mod_z(s), min: 0 },
  ZPHASE: { name: 'Z PHASE',    f: '%.3F°', valid: CH_REFLECT, top:  90, bottom:  -90, calc: (s) => VNA_MATH.phase_z(s) },
  CS:     { name: 'SERIES C',   f: '%.4FF', valid: CH_REFLECT, top:1e-9, bottom:-1e-9, calc: (s, i, freq) => VNA_MATH.series_c(s, freq) },
  LS:     { name: 'SERIES L',   f: '%.4FH', valid: CH_REFLECT, top:1e-8, bottom:-1e-8, calc: (s, i, freq) => VNA_MATH.series_l(s, freq) },
  RP:     { name: 'PARALLEL R', f: '%.3FΩ', valid: CH_REFLECT, top:1000, bottom:    0, calc: (s) => VNA_MATH.parallel_r(s) },
  XP:     { name: 'PARALLEL X', f: '%.3FΩ', valid: CH_REFLECT, top:1000, bottom:-1000, calc: (s) => VNA_MATH.parallel_x(s) },
  CP:     { name: 'PARALLEL C', f: '%.4FF', valid: CH_REFLECT, top:1e-9, bottom:-1e-9, calc: (s, i, freq) => VNA_MATH.parallel_c(s, freq) },
  LP:     { name: 'PARALLEL L', f: '%.4FH', valid: CH_REFLECT, top:1e-8, bottom:-1e-8, calc: (s, i, freq) => VNA_MATH.parallel_l(s, freq) },
  Q:      { name: 'Q FACTOR',   f: '%.4F',  valid: CH_REFLECT, top: 100, bottom:    0, calc: (s) => VNA_MATH.qualityfactor(s), min: 0 },
  G:      { name: 'CONDUCTANCE',f: '%.3FS', valid: CH_REFLECT, top: 0.1, bottom:    0, calc: (s) => VNA_MATH.conductance(s) },
  B:      { name: 'SUSCEPTANCE',f: '%.3FS', valid: CH_REFLECT, top: 0.1, bottom: -0.1, calc: (s) => VNA_MATH.susceptance(s) },
  Y:      { name: '|Y|',        f: '%.3FS', valid: CH_REFLECT, top: 0.1, bottom:    0, calc: (s) => VNA_MATH.mod_y(s), min: 0 },
  
  // --- Прохождение (S21, S12) ---
  SMITH2: { name: 'SMITH Thru',   f: '%.6F', valid: CH_THRU,  top:   1, bottom:   -1, calc: (s) => s, rad: 1},
  POLAR2: { name: 'POLAR Thru',   f: '%.3F', valid: CH_THRU,  top:   1, bottom:   -1, calc: (s) => s, rad: 2},
  RSER:   { name: 'SERIES R',     f: '%.3FΩ', valid: CH_THRU, top: 500, bottom: -500, calc: (s) => VNA_MATH.s21series_r(s) },
  XSER:   { name: 'SERIES X',     f: '%.3FΩ', valid: CH_THRU, top: 500, bottom: -500, calc: (s) => VNA_MATH.s21series_x(s) },
  ZSER:   { name: 'SERIES |Z|',   f: '%.3FΩ', valid: CH_THRU, top: 500, bottom:    0, calc: (s) => VNA_MATH.s21series_z(s), min: 0 },
  RSH:    { name: 'SHUNT R',      f: '%.3FΩ', valid: CH_THRU, top: 250, bottom: -250, calc: (s) => VNA_MATH.s21shunt_r(s) },
  XSH:    { name: 'SHUNT X',      f: '%.3FΩ', valid: CH_THRU, top: 250, bottom: -250, calc: (s) => VNA_MATH.s21shunt_x(s) },
  ZSH:    { name: 'SHUNT |Z|',    f: '%.3FΩ', valid: CH_THRU, top: 250, bottom:    0, calc: (s) => VNA_MATH.s21shunt_z(s), min: 0 },
  QS21:   { name: 'Q FACTOR Thru',f: '%.4F',  valid: CH_THRU, top: 100, bottom:    0, calc: (s) => VNA_MATH.s21_qualityfactor(s), min: 0 }
};

const MARKER_INFO = {
  LIN:        { name: "LIN",        valid: CH_ALL,     calcRe: VNA_MATH.linear,      calcIm: VNA_MATH.phase,       fmt: '%.2f %+.1f°',  isLC: false },
  LOG:        { name: "LOG",        valid: CH_ALL,     calcRe: VNA_MATH.logmag,      calcIm: VNA_MATH.phase,       fmt: '%.1fdB %+.2f°',isLC: false },
  REIM:       { name: "Re + jIm",   valid: CH_ALL,     calcRe: v => v.re,            calcIm: v => v.im,            fmt: '%.3F %j+.3F',  isLC: false },
  RX:         { name: "R + jX",     valid: CH_REFLECT, calcRe: VNA_MATH.resistance,  calcIm: VNA_MATH.reactance,   fmt: '%.3F %j+.3FΩ', isLC: false },
  RLC:        { name: "R + L/C",    valid: CH_REFLECT, calcRe: VNA_MATH.resistance,  calcIm: VNA_MATH.reactance,   fmt: '%.3FΩ %j+.3F', isLC: true  },
  GB:         { name: "G + jB",     valid: CH_REFLECT, calcRe: VNA_MATH.conductance, calcIm: VNA_MATH.susceptance, fmt: '%.3F %j+.3FS', isLC: false, admit: true },
  GLC:        { name: "G + L/C",    valid: CH_REFLECT, calcRe: VNA_MATH.conductance, calcIm: VNA_MATH.susceptance, fmt: '%.3FS %j+.3F', isLC: true,  admit: true },
  RpXp:       { name: "Rp + jXp",   valid: CH_REFLECT, calcRe: VNA_MATH.parallel_r,  calcIm: VNA_MATH.parallel_x,  fmt: '%.3F %j+.3FΩ', isLC: false, admit: true },
  RpLC:       { name: "Rp + L/C",   valid: CH_REFLECT, calcRe: VNA_MATH.parallel_r,  calcIm: VNA_MATH.parallel_x,  fmt: '%.3FΩ %j+.3F', isLC: true,  admit: true },
  SHUNT_RX:   { name: "R+jX SH",    valid: CH_THRU,    calcRe: VNA_MATH.s21shunt_r,  calcIm: VNA_MATH.s21shunt_x,  fmt: '%.3F %j+.3FΩ', isLC: false },
  SHUNT_RLC:  { name: "R+L/C SH",   valid: CH_THRU,    calcRe: VNA_MATH.s21shunt_r,  calcIm: VNA_MATH.s21shunt_x,  fmt: '%.3FΩ %j+.3F', isLC: true  },
  SERIES_RX:  { name: "R+jX SE",    valid: CH_THRU,    calcRe: VNA_MATH.s21series_r, calcIm: VNA_MATH.s21series_x, fmt: '%.3F %j+.3FΩ', isLC: false },
  SERIES_RLC: { name: "R+L/C SE",   valid: CH_THRU,    calcRe: VNA_MATH.s21series_r, calcIm: VNA_MATH.s21series_x, fmt: '%.3FΩ %j+.3F', isLC: true  }
};

function formatSmithValue(type, freq, value) {
  const info = MARKER_INFO[type] || MARKER_INFO.REIM;
  let zr = info.calcRe(value);
  let zi = info.calcIm(value);
  let suffix = '';
  if (info.isLC) {
    const w = 2 * Math.PI * freq; // аналог get_w(idx)
    if (zi < 0) { zi = -1.0 / (w * zi); suffix = 'F'; }
    else        { zi   = zi / w;        suffix = 'H'; }
  }
  return formatValue(info.fmt, zr, zi) + suffix;
}