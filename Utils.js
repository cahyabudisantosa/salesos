// ═══════════════════════════════════════════
// SALES OS — Utils.gs
// Shared helpers untuk semua service
// ═══════════════════════════════════════════

const SheetUtils = {

  // ── Get sheet by name ────────────────────
  getSheet(name) {
    const sheet = SS.getSheetByName(name);
    if (!sheet) throw new Error('Sheet tidak ditemukan: ' + name);
    return sheet;
  },

  // ── Get all rows as array of objects ─────
  getRows(sheetName) {
    const sheet = this.getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];

    const headers = data[0].map(h => String(h).trim().toLowerCase());
    return data.slice(1)
      .filter(row => row[0] !== '' && row[0] !== null)
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => {
          let val = row[i];
          // Normalize dates
          if (val instanceof Date) val = val.toISOString();
          // Normalize empty
          if (val === null || val === undefined) val = '';
          obj[h] = val;
        });
        return obj;
      });
  },

  // ── Find row index by field value ────────
  findRowIndex(sheetName, field, value) {
    const sheet = this.getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return -1;

    const headers = data[0].map(h => String(h).trim().toLowerCase());
    const colIdx = headers.indexOf(field.toLowerCase());
    if (colIdx === -1) return -1;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][colIdx]) === String(value)) return i + 1; // 1-indexed
    }
    return -1;
  },

  // ── Get headers of sheet ─────────────────
  getHeaders(sheetName) {
    const sheet = this.getSheet(sheetName);
    const row = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    return row.map(h => String(h).trim().toLowerCase());
  },

  // ── Append row (object → array) ──────────
  appendRow(sheetName, obj) {
    const sheet = this.getSheet(sheetName);
    const headers = this.getHeaders(sheetName);
    const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
    sheet.appendRow(row);
    return obj;
  },

  // ── Update row by id ─────────────────────
  updateRow(sheetName, id, updates) {
    const sheet = this.getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return false;

    const headers = data[0].map(h => String(h).trim().toLowerCase());
    const idIdx = headers.indexOf('id');
    if (idIdx === -1) return false;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIdx]) === String(id)) {
        Object.keys(updates).forEach(key => {
          const colIdx = headers.indexOf(key.toLowerCase());
          if (colIdx !== -1) {
            sheet.getRange(i + 1, colIdx + 1).setValue(updates[key]);
          }
        });
        return true;
      }
    }
    return false;
  },

  // ── Delete row by id ─────────────────────
  deleteRow(sheetName, id) {
    const sheet = this.getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return false;

    const headers = data[0].map(h => String(h).trim().toLowerCase());
    const idIdx = headers.indexOf('id');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIdx]) === String(id)) {
        sheet.deleteRow(i + 1);
        return true;
      }
    }
    return false;
  },

  // ── Generate ID ──────────────────────────
  generateId(prefix = '') {
    const ts = new Date().getTime().toString(36);
    const rand = Math.random().toString(36).slice(2, 6);
    return (prefix ? prefix + '_' : '') + ts + rand;
  },

  // ── Now ISO ──────────────────────────────
  now() {
    return new Date().toISOString();
  },

  // ── Today YYYY-MM-DD ─────────────────────
  today() {
    return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  },

  // ── Cache helper ─────────────────────────
  cache: CacheService.getScriptCache(),

  getCached(key) {
    try {
      const val = this.cache.get(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  },

  setCached(key, data, ttl = 60) {
    try {
      this.cache.put(key, JSON.stringify(data), ttl);
    } catch (e) { Logger.log('Cache error: ' + e); }
  },

  clearCache(key) {
    try { this.cache.remove(key); } catch (e) {}
  },
};
