// ═══════════════════════════════════════════
// SALES OS — FollowUp.gs
// Follow Up Engine: Create, Update, Overdue
// ═══════════════════════════════════════════

const FollowUpService = {

  // ── Get All ──────────────────────────────
  getAll(params = {}) {
    let rows = SheetUtils.getRows(SHEETS.FOLLOWUPS);
    const today = SheetUtils.today();

    // Enrich dengan status overdue/today
    rows = rows.map(r => ({
      ...r,
      is_overdue: r.status === 'pending' && r.next_followup < today,
      is_today:   r.status === 'pending' && r.next_followup === today,
    }));

    // Filter
    if (params.status === 'overdue') {
      rows = rows.filter(r => r.is_overdue);
    } else if (params.status === 'today') {
      rows = rows.filter(r => r.is_today);
    } else if (params.status === 'done') {
      rows = rows.filter(r => r.status === 'done');
    } else if (params.lead_id) {
      rows = rows.filter(r => r.lead_id === params.lead_id);
    }

    // Enrich dengan info lead
    const leads = SheetUtils.getRows(SHEETS.LEADS);
    rows = rows.map(fu => {
      const lead = leads.find(l => l.id === fu.lead_id) || {};
      return {
        ...fu,
        lead_name:   fu.lead_name || lead.nama || '',
        lead_wa:     lead.no_wa || '',
        lead_area:   lead.area || '',
        lead_status: lead.status || 'cold',
      };
    });

    // Sort: overdue dulu, lalu by date ASC
    rows.sort((a, b) => {
      if (a.is_overdue && !b.is_overdue) return -1;
      if (!a.is_overdue && b.is_overdue) return 1;
      return new Date(a.next_followup) - new Date(b.next_followup);
    });

    return rows;
  },

  // ── Create ───────────────────────────────
  create(data) {
    if (!data.lead_id) throw new Error('lead_id diperlukan');
    if (!data.next_followup) throw new Error('next_followup diperlukan');

    const newFU = {
      id:           data.id || SheetUtils.generateId('fu'),
      lead_id:      data.lead_id,
      lead_name:    data.lead_name || '',
      next_followup:data.next_followup,
      note:         data.note || '',
      status:       'pending',
      created_at:   SheetUtils.now(),
    };

    SheetUtils.appendRow(SHEETS.FOLLOWUPS, newFU);

    // Log ke activity
    ActivityService.create({
      lead_id: data.lead_id,
      activity_type: 'note',
      note: 'Follow up dijadwalkan: ' + data.next_followup + (data.note ? ' — ' + data.note : ''),
      created_by: data.created_by || 'Sales',
    });

    return newFU;
  },

  // ── Update (complete / reschedule) ───────
  update(data) {
    if (!data.id) throw new Error('ID diperlukan');

    const updates = {
      updated_at: SheetUtils.now(),
    };
    if (data.status)       updates.status = data.status;
    if (data.next_followup) updates.next_followup = data.next_followup;
    if (data.note)         updates.note = data.note;

    SheetUtils.updateRow(SHEETS.FOLLOWUPS, data.id, updates);
    return { id: data.id, ...updates };
  },

  // ── Get overdue count ─────────────────────
  getOverdueCount() {
    const today = SheetUtils.today();
    const rows = SheetUtils.getRows(SHEETS.FOLLOWUPS);
    return rows.filter(r => r.status === 'pending' && r.next_followup < today).length;
  },
};


// ═══════════════════════════════════════════
// SALES OS — Activity.gs
// Timeline histori komunikasi customer
// ═══════════════════════════════════════════

const ActivityService = {

  // ── Get by Lead ID ───────────────────────
  getByLead(leadId) {
    if (!leadId) return [];
    const rows = SheetUtils.getRows(SHEETS.ACTIVITIES);
    return rows
      .filter(r => r.lead_id === leadId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 30); // Max 30 aktivitas terakhir
  },

  // ── Create ───────────────────────────────
  create(data) {
    if (!data.lead_id) throw new Error('lead_id diperlukan');

    const newActivity = {
      id:            data.id || SheetUtils.generateId('act'),
      lead_id:       data.lead_id,
      activity_type: data.activity_type || 'note',
      note:          data.note || '',
      created_by:    data.created_by || 'Sales',
      created_at:    data.created_at || SheetUtils.now(),
    };

    SheetUtils.appendRow(SHEETS.ACTIVITIES, newActivity);
    return newActivity;
  },
};


// ═══════════════════════════════════════════
// SALES OS — User.gs
// User management
// ═══════════════════════════════════════════

const UserService = {

  // ── Get All ──────────────────────────────
  getAll(params = {}) {
    let rows = SheetUtils.getRows(SHEETS.USERS);
    if (params.role) {
      rows = rows.filter(r => r.role === params.role);
    }
    // Jangan return password field
    return rows.map(({ password, ...rest }) => rest);
  },

  // ── Get By Email ─────────────────────────
  getByEmail(email) {
    if (!email) return null;
    const rows = SheetUtils.getRows(SHEETS.USERS);
    const user = rows.find(r => r.email === email);
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
  },

  // ── Get By ID ────────────────────────────
  getById(id) {
    const rows = SheetUtils.getRows(SHEETS.USERS);
    const user = rows.find(r => r.id === id);
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
  },

  // ── Create ───────────────────────────────
  create(data) {
    if (!data.email) throw new Error('Email diperlukan');
    if (!data.nama)  throw new Error('Nama diperlukan');

    // Cek duplikat email
    const existing = this.getByEmail(data.email);
    if (existing) throw new Error('Email sudah terdaftar');

    const newUser = {
      id:         data.id || SheetUtils.generateId('usr'),
      nama:       data.nama.trim(),
      email:      data.email.trim().toLowerCase(),
      role:       data.role || 'sales',
      area:       data.area || '',
      no_wa:      data.no_wa || '',
      created_at: SheetUtils.now(),
    };

    SheetUtils.appendRow(SHEETS.USERS, newUser);
    return newUser;
  },
};
