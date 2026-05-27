/* ═══════════════════════════════════════════
   SALES OS — Leads Module
   CRUD, Search, Filter, Lead Detail, Timeline
═══════════════════════════════════════════ */

(async () => {
  await Auth.init();
  if (!Auth.requireAuth()) return;

  const user = Auth.getUser();
  let allLeads = [];
  let filteredLeads = [];
  let currentPage = 1;
  let viewMode = 'grid'; // 'grid' | 'list'
  let activeStatus = '';
  let searchQuery = '';
  let areaFilter = '';
  let salesFilter = '';

  // ── Render Shell ──────────────────────────
  document.getElementById('sidebar-container').innerHTML = Sidebar.render('leads');
  Sidebar.attachToggle();
  document.getElementById('bottom-nav-container').innerHTML = BottomNav.render('leads');
  document.getElementById('header-container').innerHTML = PageHeader.render(
    'Leads',
    'Kelola semua prospek',
    `<button class="btn btn-primary btn-sm" onclick="LeadModal.openCreate()">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
       + Lead
     </button>`
  );
  document.getElementById('menu-btn').style.display = '';

  // Show sales filter for owner/admin
  if (user.role === 'owner' || user.role === 'admin') {
    document.getElementById('sales-filter').style.display = '';
  }

  // ── Load Data ─────────────────────────────
  async function loadLeads() {
    try {
      const [leads, salesList] = await Promise.all([
        API.Leads.getAll(),
        API.Users.getSales(),
      ]);
      allLeads = leads;

      // Populate area filter
      const areas = [...new Set(leads.map(l => l.area).filter(Boolean))].sort();
      const areaEl = document.getElementById('area-filter');
      areas.forEach(a => areaEl.insertAdjacentHTML('beforeend', `<option value="${a}">${a}</option>`));

      // Populate sales filter
      const salesEl = document.getElementById('sales-filter');
      salesList.forEach(s => salesEl.insertAdjacentHTML('beforeend', `<option value="${s.id}">${s.nama}</option>`));

      applyFilters();
    } catch (err) {
      console.error('Leads load error:', err);
      Utils.toast('Gagal memuat leads', 'error');
    }
  }

  // ── Filter & Search ───────────────────────
  function applyFilters() {
    let leads = [...allLeads];

    if (activeStatus) leads = leads.filter(l => l.status === activeStatus);
    if (areaFilter) leads = leads.filter(l => l.area === areaFilter);
    if (salesFilter) leads = leads.filter(l => l.sales_id === salesFilter);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      leads = leads.filter(l =>
        (l.nama || '').toLowerCase().includes(q) ||
        (l.no_wa || '').includes(q) ||
        (l.area || '').toLowerCase().includes(q) ||
        (l.address || '').toLowerCase().includes(q)
      );
    }

    filteredLeads = leads;
    currentPage = 1;
    renderLeads();
  }

  function renderLeads() {
    const container = document.getElementById('leads-container');
    const countEl = document.getElementById('lead-count');
    const emptyEl = document.getElementById('empty-state');
    const loadMoreWrap = document.getElementById('load-more-wrap');

    const pageLeads = filteredLeads.slice(0, currentPage * CONFIG.PAGE_SIZE);
    const hasMore = filteredLeads.length > pageLeads.length;

    countEl.textContent = `${filteredLeads.length} lead ditemukan`;

    if (filteredLeads.length === 0) {
      container.innerHTML = '';
      emptyEl.style.display = '';
      loadMoreWrap.style.display = 'none';
      return;
    }

    emptyEl.style.display = 'none';

    // Grid vs List view
    if (viewMode === 'grid') {
      container.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px';
    } else {
      container.style.cssText = 'display:flex;flex-direction:column;gap:8px';
    }

    container.innerHTML = pageLeads.map(lead => LeadCard.render(lead)).join('');

    loadMoreWrap.style.display = hasMore ? 'block' : 'none';
  }

  // ── Event Listeners ───────────────────────

  // Search with debounce
  document.getElementById('search-input').addEventListener('input', Utils.debounce(e => {
    searchQuery = e.target.value.trim();
    applyFilters();
  }, 300));

  // Area filter
  document.getElementById('area-filter').addEventListener('change', e => {
    areaFilter = e.target.value;
    applyFilters();
  });

  // Sales filter
  document.getElementById('sales-filter').addEventListener('change', e => {
    salesFilter = e.target.value;
    applyFilters();
  });

  // Status filter chips
  document.getElementById('status-filter').addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeStatus = chip.dataset.status;
    applyFilters();
  });

  // View mode
  document.getElementById('view-grid').addEventListener('click', () => {
    viewMode = 'grid';
    renderLeads();
  });
  document.getElementById('view-list').addEventListener('click', () => {
    viewMode = 'list';
    renderLeads();
  });

  // Load more
  document.getElementById('load-more-btn').addEventListener('click', () => {
    currentPage++;
    renderLeads();
  });

  // Check URL for ?action=new
  if (new URLSearchParams(location.search).get('action') === 'new') {
    setTimeout(() => LeadModal.openCreate(), 300);
  }

  // ── Init ──────────────────────────────────
  await loadLeads();


  // ═══════════════════════════════════════════
  // LEAD MODAL (Create / Edit)
  // ═══════════════════════════════════════════

  window.LeadModal = {
    _leadId: null,

    async openCreate() {
      this._leadId = null;
      const salesList = await API.Users.getSales();
      Modal.createAndOpen('lead-modal', '+ Tambah Lead', this._form(null, salesList));
    },

    async openEdit(id) {
      this._leadId = id;
      const lead = allLeads.find(l => l.id === id) || await API.Leads.getById(id);
      const salesList = await API.Users.getSales();
      Modal.createAndOpen('lead-modal', 'Edit Lead', this._form(lead, salesList));
    },

    _form(lead = null, salesList = []) {
      const s = lead || {};
      return `
      <div class="form-group">
        <label class="form-label">Nama Customer *</label>
        <input type="text" class="form-control" id="f-nama" placeholder="Budi Santoso" value="${s.nama || ''}" required>
      </div>
      <div class="form-row">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">No. WhatsApp *</label>
          <input type="tel" class="form-control" id="f-wa" placeholder="08xxxx" value="${s.no_wa || ''}">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Area</label>
          <input type="text" class="form-control" id="f-area" placeholder="Kelapa Gading" value="${s.area || ''}">
        </div>
      </div>
      <div class="form-group mt-3">
        <label class="form-label">Alamat Lengkap</label>
        <input type="text" class="form-control" id="f-address" placeholder="Jl. Mangga No. 5 Blok A" value="${s.address || ''}">
      </div>
      <div class="form-row">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Sumber Lead</label>
          <select class="form-control" id="f-source">
            ${CONFIG.LEAD_SOURCES.map(src => `<option value="${src}" ${s.source === src ? 'selected' : ''}>${src}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Status</label>
          <select class="form-control" id="f-status">
            ${CONFIG.PIPELINE_STAGES.map(st => `<option value="${st.id}" ${s.status === st.id ? 'selected' : ''}>${st.icon} ${st.label}</option>`).join('')}
          </select>
        </div>
      </div>
      ${(user.role === 'owner' || user.role === 'admin') && salesList.length > 0 ? `
      <div class="form-group mt-3">
        <label class="form-label">Assign ke Sales</label>
        <select class="form-control" id="f-sales">
          <option value="">— Pilih Sales —</option>
          ${salesList.map(sl => `<option value="${sl.id}" ${s.sales_id === sl.id ? 'selected' : ''}>${sl.nama}</option>`).join('')}
        </select>
      </div>` : ''}
      <div class="form-group mt-3">
        <label class="form-label">Catatan</label>
        <textarea class="form-control" id="f-note" rows="3" placeholder="Customer tertarik paket 20Mbps...">${s.note || ''}</textarea>
      </div>
      <div class="flex gap-2 mt-4" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close('lead-modal')">Batal</button>
        <button class="btn btn-primary" id="lead-save-btn" onclick="LeadModal.save()">
          <span id="lead-save-text">${lead ? 'Simpan Perubahan' : 'Tambah Lead'}</span>
          <div class="spinner" id="lead-save-spinner" style="display:none;width:14px;height:14px"></div>
        </button>
        ${lead ? `<button class="btn btn-danger" onclick="LeadModal.delete('${lead.id}')">Hapus</button>` : ''}
      </div>`;
    },

    async save() {
      const nama = document.getElementById('f-nama')?.value.trim();
      if (!nama) { Utils.toast('Nama customer wajib diisi', 'warning'); return; }

      const payload = {
        nama,
        no_wa: document.getElementById('f-wa')?.value.trim(),
        area: document.getElementById('f-area')?.value.trim(),
        address: document.getElementById('f-address')?.value.trim(),
        source: document.getElementById('f-source')?.value,
        status: document.getElementById('f-status')?.value || 'cold',
        note: document.getElementById('f-note')?.value.trim(),
        sales_id: document.getElementById('f-sales')?.value || user.id,
      };
      payload.score = Utils.calcScore(payload);

      const saveBtn = document.getElementById('lead-save-btn');
      const saveText = document.getElementById('lead-save-text');
      const spinner = document.getElementById('lead-save-spinner');
      saveBtn.disabled = true;
      saveText.style.display = 'none';
      spinner.style.display = 'block';

      try {
        if (this._leadId) {
          await API.Leads.update(this._leadId, payload);
          const idx = allLeads.findIndex(l => l.id === this._leadId);
          if (idx !== -1) allLeads[idx] = { ...allLeads[idx], ...payload };
          Utils.toast('Lead berhasil diperbarui', 'success');
        } else {
          const newLead = await API.Leads.create(payload);
          allLeads.unshift({ ...payload, ...newLead, id: newLead?.id || Utils.generateId() });
          Utils.toast('Lead baru berhasil ditambahkan', 'success');
        }
        Modal.close('lead-modal');
        applyFilters();
      } catch (err) {
        Utils.toast('Gagal menyimpan lead', 'error');
        saveBtn.disabled = false;
        saveText.style.display = '';
        spinner.style.display = 'none';
      }
    },

    async delete(id) {
      if (!confirm('Hapus lead ini? Data tidak bisa dikembalikan.')) return;
      try {
        await API.Leads.delete(id);
        allLeads = allLeads.filter(l => l.id !== id);
        Modal.close('lead-modal');
        applyFilters();
        Utils.toast('Lead berhasil dihapus', 'success');
      } catch {
        Utils.toast('Gagal menghapus lead', 'error');
      }
    }
  };


  // ═══════════════════════════════════════════
  // LEAD DETAIL MODAL
  // ═══════════════════════════════════════════

  window.LeadDetail = {
    async open(id) {
      const lead = allLeads.find(l => l.id === id);
      if (!lead) return;

      Modal.createAndOpen('lead-detail-modal', lead.nama, this._renderDetail(lead));

      // Load activities async
      try {
        const activities = await API.Activities.getByLead(id);
        const timelineEl = document.getElementById('lead-timeline');
        if (timelineEl) {
          timelineEl.innerHTML = activities.length
            ? activities.map(a => this._renderActivity(a)).join('')
            : `<p class="text-sm text-muted">Belum ada aktivitas</p>`;
        }
      } catch (err) { /* ignore */ }
    },

    _renderDetail(lead) {
      const score = lead.score || Utils.calcScore(lead);
      return `
      <!-- Lead Header -->
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
        <div class="user-avatar" style="width:52px;height:52px;font-size:18px;border-radius:14px;flex-shrink:0">
          ${Utils.initials(lead.nama)}
        </div>
        <div style="flex:1">
          ${Utils.getBadgeHTML(lead.status)}
          <div style="font-size:18px;font-weight:800;margin-top:4px">${lead.nama}</div>
          <div class="text-sm text-muted">📍 ${lead.area || '-'} · ${lead.address || '-'}</div>
        </div>
      </div>

      <!-- Score -->
      <div class="card card-sm mb-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-muted font-bold" style="text-transform:uppercase;letter-spacing:0.05em">Lead Score</span>
          <span style="font-weight:800;color:${Utils.getScoreColor(score)};font-family:var(--font-mono)">${score} / 100</span>
        </div>
        <div class="score-bar"><div class="score-bar-fill" style="width:${score}%"></div></div>
      </div>

      <!-- Info Grid -->
      <div class="grid-2 mb-4">
        <div style="background:var(--navy-3);border-radius:var(--radius);padding:12px;border:1px solid var(--border)">
          <div class="text-xs text-muted" style="text-transform:uppercase;font-weight:700;margin-bottom:4px">WhatsApp</div>
          <div style="font-weight:600;font-size:14px">${lead.no_wa || '-'}</div>
        </div>
        <div style="background:var(--navy-3);border-radius:var(--radius);padding:12px;border:1px solid var(--border)">
          <div class="text-xs text-muted" style="text-transform:uppercase;font-weight:700;margin-bottom:4px">Sumber</div>
          <div style="font-weight:600;font-size:14px">${lead.source || '-'}</div>
        </div>
        <div style="background:var(--navy-3);border-radius:var(--radius);padding:12px;border:1px solid var(--border)">
          <div class="text-xs text-muted" style="text-transform:uppercase;font-weight:700;margin-bottom:4px">Masuk</div>
          <div style="font-weight:600;font-size:14px">${Utils.formatDate(lead.created_at)}</div>
        </div>
        <div style="background:var(--navy-3);border-radius:var(--radius);padding:12px;border:1px solid var(--border)">
          <div class="text-xs text-muted" style="text-transform:uppercase;font-weight:700;margin-bottom:4px">Diperbarui</div>
          <div style="font-weight:600;font-size:14px">${Utils.relativeTime(lead.updated_at)}</div>
        </div>
      </div>

      ${lead.note ? `
      <div class="card card-sm mb-4">
        <div class="text-xs text-muted" style="text-transform:uppercase;font-weight:700;margin-bottom:6px">Catatan</div>
        <p class="text-sm">${lead.note}</p>
      </div>` : ''}

      <!-- Quick Actions -->
      <div class="flex gap-2 mb-4" style="flex-wrap:wrap">
        <a href="${Utils.waLink(lead.no_wa, CONFIG.WA_TEMPLATES.followup(lead.nama))}" target="_blank" class="btn-wa">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.524 5.847L.057 23.882a.5.5 0 00.61.61l6.12-1.528A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.665-.52-5.18-1.427l-.37-.22-3.83.956.975-3.764-.24-.386A10 10 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
          Follow Up WA
        </a>
        <button class="btn btn-sm btn-secondary" onclick="Modal.close('lead-detail-modal');LeadModal.openEdit('${lead.id}')">✏️ Edit Lead</button>
        <button class="btn btn-sm btn-secondary" onclick="FollowUpModal.open('${lead.id}','${lead.nama}')">📅 Set Follow Up</button>
        <button class="btn btn-sm btn-secondary" onclick="ActivityModal.open('${lead.id}','${lead.nama}')">📝 Tambah Aktivitas</button>
      </div>

      <!-- Pipeline Status Change -->
      <div class="card card-sm mb-4">
        <div class="text-xs text-muted" style="text-transform:uppercase;font-weight:700;margin-bottom:10px">Ubah Status Pipeline</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${CONFIG.PIPELINE_STAGES.map(s => `
            <button onclick="LeadDetail.updateStatus('${lead.id}','${s.id}')"
              class="filter-chip ${lead.status === s.id ? 'active' : ''}" style="font-size:11px">
              ${s.icon} ${s.label}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Timeline -->
      <div>
        <div class="text-xs text-muted" style="text-transform:uppercase;font-weight:700;margin-bottom:12px">Histori Aktivitas</div>
        <div class="timeline" id="lead-timeline">
          <div style="display:flex;gap:8px;align-items:center"><div class="spinner" style="width:14px;height:14px"></div><span class="text-sm text-muted">Memuat histori...</span></div>
        </div>
      </div>`;
    },

    _renderActivity(a) {
      const typeIcon = { call:'📞', chat:'💬', survey:'🔍', nego:'🤝', note:'📝', install:'📡' };
      return `
      <div class="timeline-item">
        <div class="timeline-dot" style="background:var(--blue)"></div>
        <div class="timeline-time">${Utils.formatDateTime(a.created_at)} · ${a.created_by || 'Sales'}</div>
        <div class="timeline-label">${typeIcon[a.activity_type] || '📌'} ${a.activity_type}</div>
        <div class="timeline-content">${a.note || '-'}</div>
      </div>`;
    },

    async updateStatus(leadId, status) {
      try {
        await API.Leads.updateStatus(leadId, status);
        const lead = allLeads.find(l => l.id === leadId);
        if (lead) lead.status = status;
        Utils.toast(`Status diubah ke ${Utils.getStage(status).label}`, 'success');
        Modal.close('lead-detail-modal');
        applyFilters();
      } catch {
        Utils.toast('Gagal mengubah status', 'error');
      }
    }
  };


  // ═══════════════════════════════════════════
  // FOLLOW UP MODAL
  // ═══════════════════════════════════════════

  window.FollowUpModal = {
    open(leadId, leadName) {
      Modal.createAndOpen('fu-modal', `📅 Follow Up — ${leadName}`, `
        <div class="form-group">
          <label class="form-label">Tanggal Follow Up *</label>
          <input type="date" class="form-control" id="fu-date" value="${Utils.today()}" min="${Utils.today()}">
        </div>
        <div class="form-group">
          <label class="form-label">Catatan</label>
          <textarea class="form-control" id="fu-note" rows="3" placeholder="Tindak lanjut survey, konfirmasi harga..."></textarea>
        </div>
        <div class="flex gap-2 mt-4" style="justify-content:flex-end">
          <button class="btn btn-ghost" onclick="Modal.close('fu-modal')">Batal</button>
          <button class="btn btn-primary" onclick="FollowUpModal.save('${leadId}','${leadName}')">Simpan Follow Up</button>
        </div>`
      );
    },

    async save(leadId, leadName) {
      const date = document.getElementById('fu-date')?.value;
      const note = document.getElementById('fu-note')?.value.trim();
      if (!date) { Utils.toast('Tanggal wajib diisi', 'warning'); return; }
      try {
        await API.FollowUps.create({ lead_id: leadId, lead_name: leadName, next_followup: date, note });
        Utils.toast('Follow up berhasil disimpan', 'success');
        Modal.close('fu-modal');
      } catch {
        Utils.toast('Gagal menyimpan follow up', 'error');
      }
    }
  };


  // ═══════════════════════════════════════════
  // ACTIVITY MODAL
  // ═══════════════════════════════════════════

  window.ActivityModal = {
    open(leadId, leadName) {
      Modal.createAndOpen('act-modal', `📝 Tambah Aktivitas — ${leadName}`, `
        <div class="form-group">
          <label class="form-label">Tipe Aktivitas</label>
          <select class="form-control" id="act-type">
            <option value="call">📞 Telepon</option>
            <option value="chat">💬 Chat WA</option>
            <option value="survey">🔍 Survey</option>
            <option value="nego">🤝 Negosiasi</option>
            <option value="note">📝 Catatan</option>
            <option value="install">📡 Instalasi</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Keterangan *</label>
          <textarea class="form-control" id="act-note" rows="4" placeholder="Hasil survey bagus, customer setuju paket 20Mbps..."></textarea>
        </div>
        <div class="flex gap-2 mt-4" style="justify-content:flex-end">
          <button class="btn btn-ghost" onclick="Modal.close('act-modal')">Batal</button>
          <button class="btn btn-primary" onclick="ActivityModal.save('${leadId}')">Simpan</button>
        </div>`
      );
    },

    async save(leadId) {
      const type = document.getElementById('act-type')?.value;
      const note = document.getElementById('act-note')?.value.trim();
      if (!note) { Utils.toast('Keterangan wajib diisi', 'warning'); return; }
      try {
        await API.Activities.create({
          lead_id: leadId,
          activity_type: type,
          note,
          created_by: user.nama,
        });
        Utils.toast('Aktivitas berhasil dicatat', 'success');
        Modal.close('act-modal');
      } catch {
        Utils.toast('Gagal menyimpan aktivitas', 'error');
      }
    }
  };

})();
