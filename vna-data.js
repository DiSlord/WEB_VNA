/**
 * vna-data.js
 * Класс для управления данными ВНА.
 * Архитектура: динамический массив слотов, где слот 0 = Live, остальные = Memory.
 */

class VNAData {
constructor(slotsCount = 5) {
  this.slots = [];
  this.td_slots = [];
  for (let i = 0; i < slotsCount; i++) {
    this.slots.push({ uid: 0, frequencies: [], S11: [], S21: [], S12: [], S22: [] });
    this.td_slots.push({ uid: 0, cache: []});
  }
}

static tdKey(td, ch) {
  const s = `${td.mode}|${td.window}|${ch}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

setSlotData(slot, freqs, S11, S21, S12, S22) {
  const s = this.slots[slot];
  if (freqs) s.frequencies = freqs;
  if (S11) s.S11 = S11;
  if (S21) s.S21 = S21;
  if (S12) s.S12 = S12;
  if (S22) s.S22 = S22;
  s.uid++;
}

copySlot(from, to) {
  const src = this.slots[from];
  const dst = this.slots[to];
  dst.frequencies = [...src.frequencies];
  dst.S11 = [...src.S11];
  dst.S21 = [...src.S21];
  dst.S12 = [...src.S12];
  dst.S22 = [...src.S22];
  dst.uid++;
}

clearSlot(slot) {
  const s = this.slots[slot];
  s.frequencies = []; s.S11 = []; s.S21 = []; s.S12 = []; s.S22 = [];
  s.uid++;
}

// Единый интерфейс: всегда возвращает {freqs, values}
// В частотном режиме: freqs = исходные частоты
// В TD-режиме: freqs = виртуальные частоты длиной M (линейно отображаются на исходный диапазон)
getSlot(slot, channel, td = null) {
  const s = this.slots[slot];
  const data = s && s[channel];
  if (!data || data.length === 0) return { freqs: [], values: [] };
  if (data[0].phase === undefined) VNA_MATH.addPolarData(data); // Add polar data fields
  if (!td || !td.enabled) return { freqs: s.frequencies, values: data || [] };
  const key = VNAData.tdKey(td, channel);
  const td_slot = this.td_slots[slot];
  if (td_slot.uid !== s.uid) {td_slot.uid = s.uid; td_slot.cache = [];} // reset cache on new uid
  // Check cached data, if no add it
  if (!td_slot.cache[key]) td_slot.cache[key] = VNA_MATH.performTD(s.frequencies, data, td);
  const c = td_slot.cache[key];
  td._M = c._M;
  td._df = c._df;
  td._f0 = c.frequencies[0];
  td._f1 = c.frequencies[c.frequencies.length - 1];
  return { freqs: c.frequencies, values: c.values || []  };
}

hasData(slot) {
  if (!this.slots[slot]) return false;
  return this.slots[slot].frequencies.length > 0;
}

exportS1P(slot) {
  const s = this.slots[slot];
  if (!s || s.frequencies.length === 0) return '';
  let content = '# Hz S RI R 50\n';
  for (let i = 0; i < s.frequencies.length; i++) {
    const s11i = s.S11[i] || { re: 0, im: 0 };
    content += `${s.frequencies[i]} ${s11i.re} ${s11i.im}\n`;
  }
  return content;
}

exportS2P(slot) {
  const s = this.slots[slot];
  if (!s || s.frequencies.length === 0) return '';
  let content = '# Hz S RI R 50\n';
  for (let i = 0; i < s.frequencies.length; i++) {
    const s11i = s.S11[i] || { re: 0, im: 0 };
    const s21i = s.S21[i] || { re: 0, im: 0 };
    const s12i = s.S12[i] || { re: 0, im: 0 };
    const s22i = s.S22[i] || { re: 0, im: 0 };
    content += `${s.frequencies[i]} ${s11i.re} ${s11i.im} ${s21i.re} ${s21i.im} ${s12i.re} ${s12i.im} ${s22i.re} ${s22i.im}\n`;
  }
  return content;
}

parseSnP(text) {
  const lines = text.split(/\r?\n/);
  const freqs = [], S11 = [], S21 = [], S12 = [], S22 = [];
  let freqMult = 1, format = 'RI';
  const toComplex = (v1, v2, fmt) => {
    if (fmt === 'RI') return { re: v1, im: v2 };
    const rad = v2 * Math.PI / 180;
    if (fmt === 'MA') return { re: v1 * Math.cos(rad), im: v1 * Math.sin(rad) };
    if (fmt === 'DB') {
      const mag = Math.pow(10, v1 / 20);
      return { re: mag * Math.cos(rad), im: mag * Math.sin(rad) };
    }
    return { re: 0, im: 0 };
  };
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('!')) continue;
    if (line.startsWith('#')) {
      const parts = line.toUpperCase().split(/\s+/);
      if (parts.includes('GHZ')) freqMult = 1e9;
      else if (parts.includes('MHZ')) freqMult = 1e6;
      else if (parts.includes('KHZ')) freqMult = 1e3;
      else freqMult = 1;
      if (parts.includes('MA')) format = 'MA';
      else if (parts.includes('DB')) format = 'DB';
      else format = 'RI';
      continue;
    }
    const nums = line.replace(/,/g, '.').split(/\s+/).map(Number);
    if (nums.length < 3 || isNaN(nums[0])) continue; 
    freqs.push(nums[0] * freqMult);
    S11.push(toComplex(nums[1], nums[2], format));
    S21.push(nums.length > 4 ? toComplex(nums[3], nums[4], format) : { re: 0, im: 0 });
    S12.push(nums.length > 6 ? toComplex(nums[5], nums[6], format) : { re: 0, im: 0 });
    S22.push(nums.length > 8 ? toComplex(nums[7], nums[8], format) : { re: 0, im: 0 });
  }
  return { freqs, S11, S21, S12, S22 };
}

} // End data