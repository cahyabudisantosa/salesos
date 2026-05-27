// ═══════════════════════════════════════════
// SALES OS — Lead.gs
// Lead CRUD + Search + Hot Leads
// ═══════════════════════════════════════════

const LeadService = {

  // ── Get All (dengan filter opsional) ─────
  getAll(params = {}) {
    const cacheKey = 'leads_all';
    // Skip cache jika ada filter
    const hasFilter = params.status || params.area || params.sales_id;

    if (!hasFilter) {
      const cached = SheetUtils.getCached(cacheKey);
      if (cached) return cached;
    }

    let rows = SheetUtils.getRows(SHEETS.LEADS);

    // Filter by status
    if (params.status) {
      rows = rows.filter(r => r.status === params.status);
    }

    // Filter by area
    if (params.area) {
      rows = rows.filter(r => r.area === params.area);
    }

    // Filter by sales_id (jika bukan owner)
    if (params.sales_id) {
      rows = rows.filter(r => r.sales_id === params.sales_id);
    }

    // Sort by updated_at DESC
    rows.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));

    if (!hasFilter) {
      SheetUtils.setCached(cacheKey, rows, 30); // cache 30 detik
    }

    return rows;
  },

  // ── Get By ID ────────────────────────────
  getById(id) {
    if (!id) throw new Error('ID diperlukan');
    const rows = SheetUtils.getRows(SHEETS.LEADS);
    const lead = rows.find(r => r.id === id);
    if (!lead) throw new Error('Lead tidak ditemukan: ' + id);
    return lead;
  },

  // ── Search ───────────────────────────────
  search(query) {
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase().trim();
    const rows = SheetUtils.getRows(SHEETS.LEADS);
    return rows.filter(r =>
      (r.nama || '').toLowerCase().includes(q) ||
      (r.no_wa || '').includes(q) ||
      (r.area || '').toLowerCase().includes(q) ||
      (r.address || '').toLowerCase().includes(q)
    ).slice(0, 20);
  },

  // ── Get Hot Leads (score >= 75) ───────────
  getHot() {
    const rows = SheetUtils.getRows(SHEETS.LEADS);
    return rows
      .filter(r => {
        const score = parseInt(r.score) || 0;
        const notClosed = r.status !== 'installed' && r.status !== 'lost';
        return score >= 75 && notClosed;
      })
      .sort((a, b) => (parseInt(b.score) || 0) - (parseInt(a.score) || 0))
      .slice(0, 10);
  },

  // ── Create ───────────────────────────────
  create(data) {
    if (!data.nama) throw new Error('Nama customer wajib diisi');

    const newLead = {
      id:         data.id || SheetUtils.generateId('lead'),
      nama:       data.nama.trim(),
      no_wa:      data.no_wa || '',
      area:       data.area || '',
      address:    data.address || '',
      source:     data.source || 'Lainnya',
      status:     data.status || 'cold',
      score:      data.score || 10,
      sales_id:   data.sales_id || '',
      created_at: data.created_at || SheetUtils.now(),
      updated_at: data.updated_at || SheetUtils.now(),
      note:       data.note || '',
    };

    SheetUtils.appendRow(SHEETS.LEADS, newLead);
    SheetUtils.clearCache('leads_all');

    // Log activity: lead masuk
    ActivityService.create({
      lead_id: newLead.id,
      activity_type: 'note',
      note: 'Lead baru masuk dari ' + newLead.source,
      created_by: data.created_by || 'System',
    });

    return newLead;
  },

  // ── Update ───────────────────────────────
  update(data) {
    if (!data.id) throw new Error('ID diperlukan untuk update');

    const updates = {};
    const allowed = ['nama', 'no_wa', 'area', 'address', 'source', 'status',
                     'score', 'sales_id', 'note', 'updated_at'];

    allowed.forEach(field => {
      if (data[field] !== undefined) updates[field] = data[field];
    });
    updates.updated_at = SheetUtils.now();

    const found = SheetUtils.updateRow(SHEETS.LEADS, data.id, updates);
    if (!found) throw new Error('Lead tidak ditemukan: ' + data.id);

    SheetUtils.clearCache('leads_all');
    return { id: data.id, ...updates };
  },

  // ── Update Status only ───────────────────
  updateStatus(id, status) {
    return this.update({ id, status });
  },

  // ── Delete ───────────────────────────────
  remove(id) {
    if (!id) throw new Error('ID diperlukan');
    const found = SheetUtils.deleteRow(SHEETS.LEADS, id);
    if (!found) throw new Error('Lead tidak ditemukan: ' + id);
    SheetUtils.clearCache('leads_all');
    return { deleted: true, id };
  },
};
