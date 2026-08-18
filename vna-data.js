/**
 * vna-data.js
 * Класс для управления данными ВНА с хранением в IndexedDB.
 * Архитектура: динамический массив слотов, где слот 0 = Live, остальные = Memory.
 */

class VNAData {
static SLOT_KEYS = ['z0', 'frequencies', 'S11', 'S21', 'S12', 'S22'];
constructor(slotsCount = 5) {
  this.slotsCount = slotsCount;
  this.slots = [];
  this.td_slots = [];
  this.storage = new VNAStorage();
  for (let i = 0; i < slotsCount; i++) {
    this.slots.push({ uid: 0, z0: 50, frequencies: [], S11: [], S21: [], S12: [], S22: [] });
    this.td_slots.push({ uid: 0, cache: {} });
  }
}

async init() {
  const loaded = await this.storage.loadAllSlots();
  for (const record of loaded) {
    const slotIdx = record.id;
    if (slotIdx < this.slotsCount && record.frequencies) {
      const slot = this.slots[slotIdx];
      VNAData.SLOT_KEYS.forEach(key => { slot[key] = record[key] ?? (key === 'z0' ? 50 : []); });
      this.td_slots[slotIdx] = { uid: 0, cache: {} };
    }
  }
}

_saveSlot(slot) {
  const s = this.slots[slot];
  const data = {};
  VNAData.SLOT_KEYS.forEach(key => { data[key] = s[key]; });
  this.storage.saveSlot(slot, data);
}

static tdKey(td, ch) {
  const s = `${td.mode}|${td.window}|${ch}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

setSlotData(slot, freqs, S11, S21, S12, S22, z0 = 50) {
  const s = this.slots[slot];
  s.z0 = z0;
  if (freqs) s.frequencies = freqs;
  if (S11) s.S11 = S11;
  if (S21) s.S21 = S21;
  if (S12) s.S12 = S12;
  if (S22) s.S22 = S22;
  s.uid++;
  this._saveSlot(slot);
}

copySlot(from, to) {
  const src = this.slots[from], dst = this.slots[to];
  VNAData.SLOT_KEYS.forEach(key => { dst[key] = Array.isArray(src[key]) ? [...src[key]] : src[key]; } );
  dst.uid++;
  this._saveSlot(to);
}

clearSlot(slot) {
  const s = this.slots[slot];
  s.z0 = 50; s.frequencies = []; s.S11 = []; s.S21 = []; s.S12 = []; s.S22 = [];
  s.uid++;
  this.storage.deleteSlot(slot);
}

getSlot(slot, channel, td = null) {
  const s = this.slots[slot];
  const data = s?.[channel];
  if (!data?.length) return {z0: 50, freqs: [], values: [] };
  if (data[0].phase === undefined) VNA_MATH.addPolarData(data);
  if (!td?.enabled) return {z0: s.z0, freqs: s.frequencies, values: data };
  const td_slot = this.td_slots[slot];
  if (td_slot.uid !== s.uid) { td_slot.uid = s.uid; td_slot.cache = {};  }
  const key = VNAData.tdKey(td, channel);
  const c = td_slot.cache[key] ??= VNA_MATH.performTD(s.frequencies, data, td);
  return {z0: s.z0, times: c.times, freqs: c.freqs, values: c.values ?? [] };
}

hasData(slot) {
  if (!this.slots[slot]) return false;
  return this.slots[slot].frequencies.length > 0;
}

exportS1P(slot) {
  const s = this.slots[slot];
  if (!s || s.frequencies.length === 0) return '';
  let content = `# Hz S RI R ${s.z0}\n`;
  for (let i = 0; i < s.frequencies.length; i++) {
    const s11i = s.S11[i] || { re: 0, im: 0 };
    content += `${s.frequencies[i]} ${s11i.re} ${s11i.im}\n`;
  }
  return content;
}

exportS2P(slot) {
  const s = this.slots[slot];
  if (!s || s.frequencies.length === 0) return '';
  let content = `# Hz S RI R ${s.z0}\n`;
  for (let i = 0; i < s.frequencies.length; i++) {
    const s11i = s.S11[i] || { re: 0, im: 0 };
    const s21i = s.S21[i] || { re: 0, im: 0 };
    const s12i = s.S12[i] || { re: 0, im: 0 };
    const s22i = s.S22[i] || { re: 0, im: 0 };
    content += `${s.frequencies[i]} ${s11i.re} ${s11i.im} ${s21i.re} ${s21i.im} ${s12i.re} ${s12i.im} ${s22i.re} ${s22i.im}\n`;
  }
  return content;
}

loadSnP(slot, data) {
  const lines = data.split(/\r?\n/);
  const freqs = [], S11 = [], S21 = [], S12 = [], S22 = [];
  let freqMult = 1, format = 'RI', z0 = 50;
  const toComplex = (v1, v2, fmt) => {
    if (fmt === 'RI') return { re: v1, im: v2 };
    const rad = v2 * Math.PI / 180;
    if (fmt === 'MA') return { re: v1 * Math.cos(rad), im: v1 * Math.sin(rad), amp: v1, phase: rad };
    if (fmt === 'DB') {
      const mag = Math.pow(10, v1 / 20);
      return { re: mag * Math.cos(rad), im: mag * Math.sin(rad), amp: mag, phase: rad  };
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
      const parsedZ0 = parseFloat(parts[parts.length - 1]);
      if (!isNaN(parsedZ0) && parsedZ0 > 0) z0 = parsedZ0;
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
  if (freqs.length < 1) return false;
  this.setSlotData(slot, freqs, S11, S21, S12, S22, z0);
  return true;
}

}

// ==========================================
// Обёртка над IndexedDB для работы со слотами
// ==========================================
class VNAStorage {
  constructor(dbName = 'VNA_DataStore', storeName = 'slots') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
    this.dbVersion = 1;
  }

  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      request.onsuccess = (e) => { this.db = e.target.result; resolve(this.db); };
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async _execute(mode, callback) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, mode);
      const store = tx.objectStore(this.storeName);
      const request = callback(store);
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = () => reject(new Error(`Operation failed`));
    });
  }

  async saveSlot(slotId, data) {
   return await this._execute('readwrite', (store) => store.put({ id: Number(slotId), ...data }) );
  }

  async loadSlot(slotId) {
    return await this._execute('readonly', (store) => store.get(Number(slotId)) ) || null;
  }

  async loadAllSlots() {
    return await this._execute('readonly', (store) => store.getAll()) || [];
  }

  async deleteSlot(slotId) {
   return await this._execute('readwrite', (store) => store.delete(Number(slotId)) );
  }

  async clear() {
    await this._execute('readwrite', (store) => store.clear());
  }
}