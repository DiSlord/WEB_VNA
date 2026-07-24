/**
 * vna-data.js
 * Класс для управления данными ВНА.
 * Архитектура: единый массив из 5 слотов, где слот 0 = Live, слоты 1-4 = M1-M4.
 */

class VNAData {
constructor() {
  this.slots = [];
  for (let i = 0; i < 5; i++)
    this.slots.push( {frequencies: [], S11: [], S21: [], S12: [], S22: []} );
}

getSlot(slot, channel) {
  if (slot < 0 || slot > 4) return { freqs: [], values: [] };
  const s = this.slots[slot];
  return { freqs: s.frequencies, values: s[channel] || [] };
}

setSlotData(slot, freqs, S11, S21 = [], S12 = [], S22 = []) {
  if (slot < 0 || slot > 4) return;
  this.slots[slot] = {
   frequencies: freqs || [],
   S11: S11 || [],
   S21: S21 || [],
   S12: S12 || [],
   S22: S22 || []
  };
}

setLiveData(freqs, S11, S21, S12 = [], S22 = []) {
  this.setSlotData(0, freqs, S11, S21, S12, S22);
}

copySlot(src, dst) {
  if (src < 0 || src > 4 || dst < 0 || dst > 4) return;
  const s = this.slots[src];
  this.slots[dst] = {
   frequencies: [...s.frequencies],
   S11: [...s.S11], S21: [...s.S21],
   S12: [...s.S12], S22: [...s.S22]
  };
}

clearSlot(slot) {
  if (slot < 0 || slot > 4) return;
  this.slots[slot] = { frequencies: [], S11: [], S21: [], S12: [], S22: [] };
}

clearAll() {
  for (let i = 0; i < 5; i++) this.clearSlot(i);
}

getPointCount(slot = 0) {
  return this.slots[slot].frequencies.length;
}

hasData(slot) {
  if (slot < 0 || slot > 4) return false;
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
    const nums = line.split(/\s+/).map(Number);
    if (nums.length < 3 || isNaN(nums[0])) continue; 
    freqs.push(nums[0] * freqMult);
    S11.push(toComplex(+nums[1], +nums[2], format));
    S21.push(nums.length > 4 ? toComplex(nums[3], nums[4], format) : { re: 0, im: 0 });
    S12.push(nums.length > 6 ? toComplex(nums[5], nums[6], format) : { re: 0, im: 0 });
    S22.push(nums.length > 8 ? toComplex(nums[7], nums[8], format) : { re: 0, im: 0 });
  }
  return { freqs, S11, S21, S12, S22 };
}

} // End data