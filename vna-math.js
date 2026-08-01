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

 // RESISTANCE (R) = Z0 * (1 - |Γ|²) / |1 - Γ|²
 resistance: (s) => {
   const mag2 = VNA_MATH._l(s.re, s.im);
   const denom = VNA_MATH._l(1 - s.re, s.im);
   return denom === 0 ? Infinity : VNA_MATH.Z0 * (1 - mag2) / denom;
 },

 // REACTANCE (X) = -2 * Z0 * Im(Γ) / |1 - Γ|²
 reactance: (s) => {
   const re = 1.0 - s.re, im = -s.im;
   const l = VNA_MATH._l(re, im);
   return l === 0 ? Infinity : -2 * VNA_MATH.Z0 * im / l;
 },

 // |Z| = Z0 * sqrt( ((1+re)^2 + im^2) / ((1-re)^2 + im^2) )
 mod_z: (s) => {
   const num = VNA_MATH._l(1.0 + s.re, s.im);
   const den = VNA_MATH._l(1.0 - s.re, s.im);
   return VNA_MATH.Z0 * Math.sqrt(num / den);
 },

 // Z PHASE = atan2(2 * im, 1 - |Γ|²) * 180 / PI
 phase_z: (s) => {
   const r = 1.0 - VNA_MATH._l(s.re, s.im);
   const x = 2.0 * s.im;
   return Math.atan2(x, r) * 180 / Math.PI;
 },

 // SERIES C = -1 / (ω * X)
 series_c: (s, freq) => {
   const zi = VNA_MATH.reactance(s);
   const w = 2 * Math.PI * freq;
   return -1.0 / (w * zi);
 },

 // SERIES L = X / ω
 series_l: (s, freq) => {
   const zi = VNA_MATH.reactance(s);
   const w = 2 * Math.PI * freq;
   return zi / w;
 },

 // CONDUCTANCE (G) = 2 / Z0 * Re(1 + Γ) / |1 + Γ|² - 1/Z0
 conductance: (s) => {
   const z0_inv = 1.0 / VNA_MATH.Z0;
   const re = 1.0 + s.re, im = s.im;
   const l = VNA_MATH._l(re, im);
   return l === 0 ? Infinity : 2 * z0_inv * re / l - z0_inv;
 },

 // SUSCEPTANCE (B) = -2 / Z0 * Im(1 + Γ) / |1 + Γ|²
 susceptance: (s) => {
   const z0_inv = 1.0 / VNA_MATH.Z0;
   const re = 1.0 + s.re, im = s.im;
   const l = VNA_MATH._l(re, im);
   return l === 0 ? Infinity : -2 * z0_inv * im / l;
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

 // PARALLEL C = B / ω
 parallel_c: (s, freq) => {
   const yi = VNA_MATH.susceptance(s);
   const w = 2 * Math.PI * freq;
   return yi / w;
 },

 // PARALLEL L = Xp / ω
 parallel_l: (s, freq) => {
   const xp = VNA_MATH.parallel_x(s);
   const w = 2 * Math.PI * freq;
   return xp / w;
 },

 // |Y| = 1 / |Z|
 mod_y: (s) => {
   const z = VNA_MATH.mod_z(s);
   return 1.0 / z;
 },

 // Q FACTOR = |2 * Im(Γ) / (1 - |Γ|²)|
 qualityfactor: (s) => {
   const r = 1.0 - VNA_MATH._l(s.re, s.im);
   const x = 2.0 * s.im;
   return r === 0 ? Infinity : Math.abs(x / r);
 },

 // --- S21 Specific Calculations ---
 // S21 SERIES R = 2 * Z0 * Re(S21) / |S21|² - 2 * Z0
 s21series_r: (s) => {
   const l = VNA_MATH._l(s.re, s.im);
   return l === 0 ? 0 : (2 * VNA_MATH.Z0 * s.re / l) - (2 * VNA_MATH.Z0);
 },

 // S21 SERIES X = -2 * Z0 * Im(S21) / |S21|²
 s21series_x: (s) => {
   const l = VNA_MATH._l(s.re, s.im);
   return l === 0 ? Infinity : -2 * VNA_MATH.Z0 * s.im / l;
 },

 // S21 SERIES |Z| = 2*Z0 * sqrt(|1-S21|² / |S21|²)
 s21series_z: (s) => {
   const num = VNA_MATH._l(1.0 - s.re, s.im);
   const l = VNA_MATH._l(s.re, s.im);
   return l === 0 ? Infinity : 2 * VNA_MATH.Z0 * Math.sqrt(num / l);
 },

 // S21 SHUNT R = 0.5*Z0 * Re(1 - S21) / |1 - S21|² - 0.5 * Z0
 s21shunt_r: (s) => {
   const re = 1.0 - s.re;
   const im = -s.im;
   const l = VNA_MATH._l(re, im);
   return l === 0 ? Infinity : (0.5 * VNA_MATH.Z0 * re / l) - (0.5 * VNA_MATH.Z0);
 },

 // S21 SHUNT X = -0.5*Z0 * Im(1 - S21) / |1 - S21|²
 s21shunt_x: (s) => {
   const re = 1.0 - s.re;
   const im = -s.im;
   const l = VNA_MATH._l(re, im);
   return l === 0 ? Infinity : -0.5 * VNA_MATH.Z0 * im / l;
 },

 // S21 SHUNT |Z| = 0.5*Z0 * sqrt(|S21|² / |1 - S21|²)
 s21shunt_z: (s) => {
   const num = VNA_MATH._l(s.re, s.im);
   const l = VNA_MATH._l(1.0 - s.re, s.im);
   return l === 0 ? Infinity : 0.5 * VNA_MATH.Z0 * Math.sqrt(num / l);
 },

 // S21 Q FACTOR = |Im(S21) / (Re(S21) - |S21|²)|
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
  LOGMAG: { name: 'Logmag',    f: '%.3fdB', valid: CH_ALL, top  : 0, bottom:  -80, calc: VNA_MATH.logmag },
  PHASE:  { name: 'Phase',     f: '%.3F°',  valid: CH_ALL, top :180, bottom: -180, calc: VNA_MATH.phase },
  DELAY:  { name: 'Delay',     f: '%.4Fs',  valid: CH_ALL, top:1e-6, bottom:-1e-6, calc: (s, i, freq, data, freqs) => VNA_MATH.groupdelay(data, i, freqs) },
  LINEAR: { name: 'Linear'   , f: '%.4F',   valid: CH_ALL, top:   1, bottom:    0, calc: VNA_MATH.linear, min: 0, },
  REAL:   { name: 'Real',      f: '%.6F',   valid: CH_ALL, top:   1, bottom:   -1, calc: VNA_MATH.real  },
  IMAG:   { name: 'Imaginary', f: '%.6F',   valid: CH_ALL, top:   1, bottom:   -1, calc: VNA_MATH.imag  },

  // --- Отражение (S11, S22) ---
  SMITH1: { name: 'Smith Refl', f: '%.6F',  valid: CH_REFLECT, top:   1, bottom:   -1, calc: (s) => s, rad: 1},
  SWR:    { name: 'SWR',        f: '%.3F',  valid: CH_REFLECT, top:   5, bottom:    1, calc: VNA_MATH.swr, min: 1 },
  R:      { name: 'Resistance', f: '%.3FΩ', valid: CH_REFLECT, top: 500, bottom:    0, calc: VNA_MATH.resistance },
  X:      { name: 'Reactance',  f: '%.3FΩ', valid: CH_REFLECT, top: 500, bottom: -500, calc: VNA_MATH.reactance },
  Z:      { name: '|Z|',        f: '%.3FΩ', valid: CH_REFLECT, top: 500, bottom:    0, calc: VNA_MATH.mod_z, min: 0 },
  ZPHASE: { name: 'Z PHASE',    f: '%.3F°', valid: CH_REFLECT, top:  90, bottom:  -90, calc: VNA_MATH.phase_z },
  CS:     { name: 'Series C',   f: '%.4FF', valid: CH_REFLECT, top:1e-9, bottom:-1e-9, calc: (s, i, freq) => VNA_MATH.series_c(s, freq) },
  LS:     { name: 'Series L',   f: '%.4FH', valid: CH_REFLECT, top:1e-8, bottom:-1e-8, calc: (s, i, freq) => VNA_MATH.series_l(s, freq) },
  RP:     { name: 'Parallel R', f: '%.3FΩ', valid: CH_REFLECT, top:1000, bottom:    0, calc: VNA_MATH.parallel_r },
  XP:     { name: 'Parallel X', f: '%.3FΩ', valid: CH_REFLECT, top:1000, bottom:-1000, calc: VNA_MATH.parallel_x },
  CP:     { name: 'Parallel C', f: '%.4FF', valid: CH_REFLECT, top:1e-9, bottom:-1e-9, calc: (s, i, freq) => VNA_MATH.parallel_c(s, freq) },
  LP:     { name: 'Parallel L', f: '%.4FH', valid: CH_REFLECT, top:1e-8, bottom:-1e-8, calc: (s, i, freq) => VNA_MATH.parallel_l(s, freq) },
  Q:      { name: 'Q factor',   f: '%.4F',  valid: CH_REFLECT, top: 100, bottom:    0, calc: VNA_MATH.qualityfactor, min: 0 },
  G:      { name: 'Conductance',f: '%.3FS', valid: CH_REFLECT, top: 0.1, bottom:    0, calc: VNA_MATH.conductance },
  B:      { name: 'Susceptance',f: '%.3FS', valid: CH_REFLECT, top: 0.1, bottom: -0.1, calc: VNA_MATH.susceptance },
  Y:      { name: '|Y|',        f: '%.3FS', valid: CH_REFLECT, top: 0.1, bottom:    0, calc: VNA_MATH.mod_y, min: 0 },
  
  // --- Прохождение (S21, S12) ---
  SMITH2: { name: 'Smith Thru',   f: '%.6F', valid: CH_THRU,  top:   1, bottom:   -1, calc: (s) => s, rad: 1},
  RSER:   { name: 'Series R',     f: '%.3FΩ', valid: CH_THRU, top: 500, bottom: -500, calc: VNA_MATH.s21series_r },
  XSER:   { name: 'Series X',     f: '%.3FΩ', valid: CH_THRU, top: 500, bottom: -500, calc: VNA_MATH.s21series_x },
  ZSER:   { name: 'Series |Z|',   f: '%.3FΩ', valid: CH_THRU, top: 500, bottom:    0, calc: VNA_MATH.s21series_z, min: 0 },
  RSH:    { name: 'Shunt R',      f: '%.3FΩ', valid: CH_THRU, top: 250, bottom: -250, calc: VNA_MATH.s21shunt_r },
  XSH:    { name: 'Shunt X',      f: '%.3FΩ', valid: CH_THRU, top: 250, bottom: -250, calc: VNA_MATH.s21shunt_x },
  ZSH:    { name: 'Shunt |Z|',    f: '%.3FΩ', valid: CH_THRU, top: 250, bottom:    0, calc: VNA_MATH.s21shunt_z, min: 0 },
  QS21:   { name: 'Q factor Thru',f: '%.4F',  valid: CH_THRU, top: 100, bottom:    0, calc: VNA_MATH.s21_qualityfactor, min: 0 }
};

// ==========================================
//   Structire for draw complex grid
// ==========================================
const H_AXIS = { x1: -1, y1: 0, x2: 1, y2: 0 };
const V_AXIS = { x1: 0, y1: -1, x2: 0, y2: 1 };
const COMPLEX_PARAMS = {
 // ---- LIN (Polar) ----
 LIN: {
  gridRe: [0.2, 0.4, 0.6, 0.8],
  gridIm: [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180],
  reCircle(val) { return { cx: 0, cy: 0, r: val }; },
  reLabel(val)  { return { nx: val, ny: 0 }; },
  imCircle(val) { const a = val * Math.PI / 180; return { x1: 0, y1: 0, x2: Math.cos(a), y2: Math.sin(a) }; },
  imLabel(val)  { const a = val * Math.PI / 180; return { nx: Math.cos(a), ny: Math.sin(a) }; },
 },
 // ---- LOG (Polar) ----
 LOG: {
  gridRe: [-3, -6, -10, -15, -20],
  gridIm: [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180],
  reCircle(val) { return { cx: 0, cy: 0, r: Math.pow(10, val / 20) }; },
  reLabel(val)  { return { nx: Math.pow(10, val / 20), ny: 0 }; },
  imCircle(val) { const a = val * Math.PI / 180; return { x1: 0, y1: 0, x2: Math.cos(a), y2: Math.sin(a) }; },
  imLabel(val)  { const a = val * Math.PI / 180; return { nx: Math.cos(a), ny: Math.sin(a) }; },
 },
 // ---- REIM (Cartesian) ----
 REIM: {
  gridRe: [-1, -0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8, 1],
  gridIm: [-1, -0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8, 1],
  reCircle(val) { return { x1: val, y1: -1, x2: val, y2: 1 }; },
  reLabel(val)  { return { nx: val, ny: 0 }; },
  imCircle(val) { return { x1: -1, y1: val, x2: 1, y2: val }; },
  imLabel(val)  { return { nx: 0, ny: val }; },
 },
 // ---- R + X (Reflection) ----
 RX: {
  gridRe: [0.2, 0.5, 1, 2, 5, 10].map(v => v * VNA_MATH.Z0),
  gridIm: [-5, -2, -1, -0.5, -0.2, 0, 0.2, 0.5, 1, 2, 5].map(v => v * VNA_MATH.Z0),
  reCircle(R) { return { cx: R / (R + VNA_MATH.Z0), cy: 0, r: VNA_MATH.Z0 / (R + VNA_MATH.Z0) }; },
  reLabel(R)  { return { nx: (R - VNA_MATH.Z0) / (R + VNA_MATH.Z0), ny: 0 }; },
  imCircle(X) { return Math.abs(X) < 0.1 ? H_AXIS : { cx: 1, cy: VNA_MATH.Z0 / X, r: VNA_MATH.Z0 / X }; },
  imLabel(X)  { const d = (X*X + VNA_MATH.Z0*VNA_MATH.Z0); return { nx: (X*X - VNA_MATH.Z0*VNA_MATH.Z0)/d, ny: 2*VNA_MATH.Z0*X/d }; },
  edgeLabels: [ { val: Infinity, nx: 1, ny: 0, align: 'left' } ]
 },
 // ---- G + B (Admittance) ----
 GB: {
  gridRe: [0.2, 0.5, 1, 2, 5].map(v => v / VNA_MATH.Z0),
  gridIm: [-5, -2, -1, -0.5, -0.2, 0, 0.2, 0.5, 1, 2, 5].map(v => v / VNA_MATH.Z0),
  reCircle(G) { const gn = G * VNA_MATH.Z0; return { cx: -gn / (gn + 1), cy: 0, r: 1 / (gn + 1) }; },
  reLabel(G)  { const gn = G * VNA_MATH.Z0; return { nx: (1 - gn) / (1 + gn), ny: 0 }; },
  imCircle(B) { const bn = B * VNA_MATH.Z0; return Math.abs(bn) < 1e-2 ? H_AXIS : { cx: -1, cy: -1 / bn, r: -1 / bn }; },
  imLabel(B)  { const bn = B * VNA_MATH.Z0, d = bn * bn + 1; return { nx: (1 - bn * bn) / d, ny: -2 * bn / d }; },
  edgeLabels: [ { val: Infinity, nx: -1, ny: 0, align: 'right' } ]
 },
 // ---- Rp + Xp (Parallel) ----
 RpXp: {
  gridRe: [0.2, 0.5, 1, 2, 5].map(v => v * VNA_MATH.Z0),
  gridIm: [-5, -2, -1, -0.5, -0.2, 0, 0.2, 0.5, 1, 2, 5, Infinity].map(v => v * VNA_MATH.Z0),
  reCircle(Rp) { return { cx: -VNA_MATH.Z0 / (VNA_MATH.Z0 + Rp), cy: 0, r: Rp / (VNA_MATH.Z0 + Rp) }; },
  reLabel(Rp)  { return { nx: (Rp - VNA_MATH.Z0) / (Rp + VNA_MATH.Z0), ny: 0 }; },
  imCircle(Xp) { const v = Xp / VNA_MATH.Z0; return Math.abs(v) > 100 ? H_AXIS : { cx: -1, cy: v, r: v }; },
  imLabel(Xp)  { const d = (Xp*Xp + VNA_MATH.Z0*VNA_MATH.Z0); return { nx: (Xp*Xp - VNA_MATH.Z0*VNA_MATH.Z0) / d, ny: 2*VNA_MATH.Z0*Xp/d }; },
  edgeLabels: [ { val: Infinity, nx: 1, ny: 0, align: 'left' } ]
 },
 // ---- S21 Series ----
 S21SER: {
  gridRe: [-500, -250, -200, -175, -125, -100, -75, -25, 0, 50, 250],
  gridIm: [-200, -130, -50, -25, 0, 25, 50, 100, 130, 200],
  reCircle(R) { const v = (R + 2 * VNA_MATH.Z0); return Math.abs(v) < 0.1 ? V_AXIS : { cx: VNA_MATH.Z0 / v, cy: 0, r: VNA_MATH.Z0 / v }; },
  reLabel(R)  { const v = R / (2 * VNA_MATH.Z0) + 1; return  (Math.abs(v) >= 1) ? { nx: 1/v, ny: 0 } : { nx: v, ny: Math.sqrt(1 - v*v) }; },
  imCircle(X) { const v =-VNA_MATH.Z0 / X; return Math.abs(v) > 100 ? H_AXIS : { cx: 0, cy: v, r: v }; },
  imLabel(X)  { const v = - X / (2 * VNA_MATH.Z0); return Math.abs(v) >= 1 ? { nx: 0, ny: 1/v } : { nx: Math.sqrt(1 - v*v), ny: v }; },
 },
 // ---- S21 Shunt ----
 S21SH: {
  gridRe: [-10, -6.25, 0, 12.5, 25, 50],
  gridIm: [-50, -25, -12.5, -6.25, 0, 6.25, 12.5, 25, 50],
  reCircle(R) { const v = VNA_MATH.Z0 / (4*R + 2*VNA_MATH.Z0); return { cx: 1 - v, cy: 0, r: v }; },
  reLabel(R)  { const v = VNA_MATH.Z0 / (2*R +   VNA_MATH.Z0); return { nx: 1 - v, ny: 0 }; },
  imCircle(X) { const v = VNA_MATH.Z0 / (4*X); return Math.abs(v) > 100 ? H_AXIS : { cx: 1, cy: v, r: v }; },
  imLabel(X)  { const d = (16*X*X + VNA_MATH.Z0*VNA_MATH.Z0); return { nx: (16*X*X - VNA_MATH.Z0*VNA_MATH.Z0) / d, ny: 8*X*VNA_MATH.Z0 / d }; },
  edgeLabels: [ { val: Infinity, nx: 1, ny: 0, align: 'left' } ]
 }
};

const MARKER_INFO = {
  LIN:        { name: "LIN",             valid: CH_ALL,     calcRe: VNA_MATH.linear,      calcIm: VNA_MATH.phase,       fmt: '%.2f %+.1f°',  isLC: false, params: COMPLEX_PARAMS.LIN },
  LOG:        { name: "LOG",             valid: CH_ALL,     calcRe: VNA_MATH.logmag,      calcIm: VNA_MATH.phase,       fmt: '%.1fdB %+.2f°',isLC: false, params: COMPLEX_PARAMS.LOG },
  REIM:       { name: "Re + Im",         valid: CH_ALL,     calcRe: v => v.re,            calcIm: v => v.im,            fmt: '%.3F %j+.3F',  isLC: false, params: COMPLEX_PARAMS.REIM },
  RX:         { name: "R + X",           valid: CH_REFLECT, calcRe: VNA_MATH.resistance,  calcIm: VNA_MATH.reactance,   fmt: '%.3F %j+.3FΩ', isLC: false, params: COMPLEX_PARAMS.RX },
  RLC:        { name: "R + L / C",       valid: CH_REFLECT, calcRe: VNA_MATH.resistance,  calcIm: VNA_MATH.reactance,   fmt: '%.3FΩ %j+.3F', isLC: true , params: COMPLEX_PARAMS.RX },
  GB:         { name: "G + B",           valid: CH_REFLECT, calcRe: VNA_MATH.conductance, calcIm: VNA_MATH.susceptance, fmt: '%.3F %j+.3FS', isLC: false, params: COMPLEX_PARAMS.GB },
  GLC:        { name: "G + L / C",       valid: CH_REFLECT, calcRe: VNA_MATH.conductance, calcIm: VNA_MATH.susceptance, fmt: '%.3FS %j+.3F', isLC: true,  params: COMPLEX_PARAMS.GB },
  RpXp:       { name: "Rp + Xp",         valid: CH_REFLECT, calcRe: VNA_MATH.parallel_r,  calcIm: VNA_MATH.parallel_x,  fmt: '%.3F %j+.3FΩ', isLC: false, params: COMPLEX_PARAMS.RpXp },
  RpLC:       { name: "Rp + L / C",      valid: CH_REFLECT, calcRe: VNA_MATH.parallel_r,  calcIm: VNA_MATH.parallel_x,  fmt: '%.3FΩ %j+.3F', isLC: true,  params: COMPLEX_PARAMS.RpXp },
  SHUNT_RX:   { name: "R + X Shunt",     valid: CH_THRU,    calcRe: VNA_MATH.s21shunt_r,  calcIm: VNA_MATH.s21shunt_x,  fmt: '%.3F %j+.3FΩ', isLC: false, params: COMPLEX_PARAMS.S21SH },
  SHUNT_RLC:  { name: "R + L / C Shunt", valid: CH_THRU,    calcRe: VNA_MATH.s21shunt_r,  calcIm: VNA_MATH.s21shunt_x,  fmt: '%.3FΩ %j+.3F', isLC: true,  params: COMPLEX_PARAMS.S21SH },
  SERIES_RX:  { name: "R + X Series",    valid: CH_THRU,    calcRe: VNA_MATH.s21series_r, calcIm: VNA_MATH.s21series_x, fmt: '%.3F %j+.3FΩ', isLC: false, params: COMPLEX_PARAMS.S21SER },
  SERIES_RLC: { name: "R + L / C Series",valid: CH_THRU,    calcRe: VNA_MATH.s21series_r, calcIm: VNA_MATH.s21series_x, fmt: '%.3FΩ %j+.3F', isLC: true,  params: COMPLEX_PARAMS.S21SER }
};

function getSmithValue(type, value) {
  const info = MARKER_INFO[type] || MARKER_INFO.REIM;
  return {re: info.calcRe(value), im: info.calcIm(value)};
}

function formatSmithValue(type, freq, value) {
  const info = MARKER_INFO[type] || MARKER_INFO.REIM;
  let v = getSmithValue(type, value)
  let suffix = '';
  if (info.isLC) {
    const w = 2 * Math.PI * freq;
    if (v.im < 0) { v.im = -1.0 / (w * v.im); suffix = 'F'; }
    else          { v.im   = v.im / w;        suffix = 'H'; }
  }
  return formatValue(info.fmt, v.re, v.im) + suffix;
}