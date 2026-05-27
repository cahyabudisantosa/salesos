/* ═══════════════════════════════════════════
   SALES OS — Follow Up Engine
   Reminder, Overdue, Complete, History
═══════════════════════════════════════════ */

(async () => {
  await Auth.init();
  if (!Auth.requireAuth()) return;

  const user = Auth.getUser();
  let allFollowUps = [];
  let activeFilter = 'all';

  // ── Shell ──────────────────────────────────
  document.getElementById('sidebar-container').innerHTML = Sidebar.render('followup');
  Sidebar.attachToggle();
  document.getElementById('bottom-nav-container').innerHTML = BottomNav.render('followup');
  document.getElementById('header-container').innerHTML = PageHeader.render(
    'Follow Up',
    'Jadwal tindak lanjut customer',
    `<button class="btn btn-primary btn-sm" onclick="FUCreate.open()">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
       + Follow Up
     </button>`
  );
  document.getElementById('menu-btn').style.display = '';

  // ── Load ───────────────────────────────────
  async function load() {
    try {
      allFollowUps = await API.FollowUps.getAll();
      applyFilter();
      updateSummary();
    } catch (err) {
      console.error('FollowUp load error:', err);
      Utils.toast('Gagal memuat follow up', 'error');
    }
  }

  // ── Filter ─────────────────────────────────
  function applyFilter() {
    let list = [...allFollowUps];

    switch (activeFilter) {
      case 'overdue':
        list = list.filter(f => f.status === 'pending' && Utils.isOverdue(f.next_followup));
        break;
      case 'today':
        list = list.filter(f => f.status === 'pending' && Utils.isToday(f.next_followup));
        break;
      case 'upcoming':
        list = list.filter(f => {
          const d = Utils.daysUntil(f.next_followup);
          return f.status === 'pending' && d !== null && d > 0;
        });
        break;
      case 'done':
        list = list.filter(f => f.status === 'done');
        break;
      default:
        list = list.filter(f => f.status === 'pending');
        break;
    }

    // Sort: overdue first, then by date
    list = list.sort((a, b) => {
      const da = new Date(a.next_followup || 0);
      const db = new Date(b.next_followup || 0);
      return da - db;
    });

    renderList(list);
    document.getElementById('fu-count').textContent = `${list.length} follow up`;
  }

  function updateSummary() {
    const overdue = allFollowUps.filter(f => f.status === 'pending' && Utils.isOverdue(f.next_followup));
    const today = allFollowUps.filter(f => f.status === 'pending' && Utils.isToday(f.next_followup));

    // Update overdue chip label
    const overdueChip = document.querySelector('[data-filter="overdue"]');
    if (overdueChip && overdue.length > 0) {
      overdueChip.textContent = `⚠️ Overdue (${overdue.length})`;
      overdueChip.style.color = 'var(--red)';
      overdueChip.style.borderColor = 'rgba(239,68,68,0.4)';
    }

    const todayChip = document.querySelector('[data-filter="today"]');
    if (todayChip && today.length > 0) {
      todayChip.textContent = `📅 Hari Ini (${today.length})`;
      todayChip.style.color = 'var(--yellow)';
    }
  }

  // ── Render ─────────────────────────────────
  function renderList(list) {
    const container = document.getElementById('fu-list');

    if (list.length === 0) {
      container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <h3>Tidak ada follow up</h3>
        <p>Semua follow up ${activeFilter === 'done' ? 'selesai' : 'sudah ditangani'} 🎉</p>
      </div>`;
      return;
    }

    // Group by date section
    let lastSection = '';
    const html = list.map(fu => {
      const isOverdue = fu.status === 'pending' && Utils.isOverdue(fu.next_followup);
      const isToday = Utils.isToday(fu.next_followup);
      const days = Utils.daysUntil(fu.next_followup);
      const dm = Utils.getDayMonth(fu.next_followup);

      let section = '';
      let sectionLabel = '';
      if (isOverdue) section = 'overdue';
      else if (isToday) section = 'today';
      else section = fu.next_followup?.slice(0, 7) || 'other';

      if (section !== lastSection) {
        lastSection = section;
        if (section === 'overdue') sectionLabel = `<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--red);margin:16px 0 8px;padding-left:4px">⚠️ Overdue — Perlu Tindak Lanjut Segera</div>`;
        else if (section === 'today') sectionLabel = `<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--yellow);margin:16px 0 8px;padding-left:4px">📅 Hari Ini</div>`;
        else if (section !== 'other') sectionLabel = `<div style="font-size:11px;font-weight:700;color:var(--text-muted);margin:16px 0 8px;padding-left:4px">${new Date(fu.next_followup + 'T00:00:00').toLocaleString('id-ID',{month:'long',year:'numeric'})}</div>`;
      }

      let typeClass = '';
      if (isOverdue) typeClass = 'followup-overdue';
      else if (isToday) typeClass = 'followup-today';

      let daysLabel = '';
      if (fu.status === 'done') daysLabel = `<span style="color:var(--green);font-size:11px;font-weight:600">✅ Selesai</span>`;
      else if (isOverdue) daysLabel = `<span style="color:var(--red);font-size:11px;font-weight:600">⚠️ ${Math.abs(days)} hari lalu</span>`;
      else if (isToday) daysLabel = `<span style="color:var(--yellow);font-size:11px;font-weight:600">📅 Hari ini</span>`;
      else daysLabel = `<span style="color:var(--text-muted);font-size:11px">${days} hari lagi</span>`;

      return `
      ${sectionLabel}
      <div class="followup-card ${typeClass}" data-id="${fu.id}">
        <div class="followup-date-box">
          <div class="followup-day">${dm.day}</div>
          <div class="followup-month">${dm.month}</div>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14px;margin-bottom:3px">${Utils.truncate(fu.lead_name || fu.nama || '—', 30)}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">
            📍 ${fu.lead_area || fu.area || '-'} · ${Utils.getBadgeHTML(fu.lead_status || 'cold')}
          </div>
          ${fu.note ? `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px">📝 ${Utils.truncate(fu.note, 50)}</div>` : ''}
          <div class="flex items-center gap-2">
            ${daysLabel}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;align-items:flex-end">
          <a href="${Utils.waLink(fu.lead_wa || fu.no_wa || '', CONFIG.WA_TEMPLATES.followup(fu.lead_name || ''))}"
             target="_blank" class="btn-wa" style="font-size:11px;padding:5px 10px">WA</a>
          ${fu.status !== 'done' ? `
          <button onclick="FUEngine.complete('${fu.id}')" class="btn btn-sm btn-success" style="font-size:11px">Done ✓</button>
          <button onclick="FUEngine.reschedule('${fu.id}','${fu.lead_name || ''}')" class="btn btn-sm btn-ghost" style="font-size:11px">Reschedule</button>
          ` : ''}
        </div>
      </div>`;
    }).join('');

    container.innerHTML = html;
  }

  // ── Filter Events ──────────────────────────
  document.getElementById('fu-filter').addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    document.querySelectorAll('#fu-filter .filter-chip').forEach(c => {
      c.classList.remove('active');
      c.style.color = '';
      c.style.borderColor = '';
    });
    chip.classList.add('active');
    activeFilter = chip.dataset.filter;
    applyFilter();
  });

  // ── Follow Up Engine ──────────────────────
  window.FUEngine = {
    async complete(id) {
      const fu = allFollowUps.find(f => f.id === id);
      if (!fu) return;

      // Ask: done + set new follow up?
      const setNew = confirm(`Tandai selesai?\n\nTekan OK untuk selesai dan set follow up baru.\nTekan Cancel untuk hanya menandai selesai.`);

      try {
        await API.FollowUps.complete(id);
        fu.status = 'done';
        Utils.toast('Follow up ditandai selesai ✅', 'success');

        if (setNew) {
          FUEngine.reschedule(id, fu.lead_name, fu.lead_id);
        } else {
          applyFilter();
        }
      } catch {
        Utils.toast('Gagal mengubah status', 'error');
      }
    },

    reschedule(id, leadName, leadId = null) {
      const fu = allFollowUps.find(f => f.id === id);
      const lid = leadId || fu?.lead_id;

      Modal.createAndOpen('reschedule-modal', `📅 Set Follow Up Baru — ${leadName}`, `
        <div class="form-group">
          <label class="form-label">Tanggal Follow Up Berikutnya *</label>
          <input type="date" class="form-control" id="rs-date" value="${Utils.today()}" min="${Utils.today()}">
        </div>
        <div class="form-group">
          <label class="form-label">Catatan / Agenda</label>
          <textarea class="form-control" id="rs-note" rows="3" placeholder="Follow up lanjutan survey, konfirmasi keputusan..."></textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
          ${['Besok', '3 Hari', '1 Minggu', '2 Minggu'].map((label, i) => {
            const days = [1, 3, 7, 14][i];
            const date = new Date();
            date.setDate(date.getDate() + days);
            const val = date.toISOString().split('T')[0];
            return `<button class="filter-chip" style="text-align:center;padding:8px" onclick="document.getElementById('rs-date').value='${val}'">${label}</button>`;
          }).join('')}
        </div>
        <div class="flex gap-2" style="justify-content:flex-end">
          <button class="btn btn-ghost" onclick="Modal.close('reschedule-modal')">Batal</button>
          <button class="btn btn-primary" onclick="FUEngine.saveReschedule('${lid}','${leadName}')">Simpan</button>
        </div>
      `);
    },

    async saveReschedule(leadId, leadName) {
      const date = document.getElementById('rs-date')?.value;
      const note = document.getElementById('rs-note')?.value.trim();
      if (!date) { Utils.toast('Pilih tanggal terlebih dahulu', 'warning'); return; }

      try {
        const newFU = await API.FollowUps.create({
          lead_id: leadId,
          lead_name: leadName,
          next_followup: date,
          note,
        });
        allFollowUps.unshift({ ...newFU, lead_name: leadName, next_followup: date, note, status: 'pending' });
        Utils.toast('Follow up baru berhasil disimpan', 'success');
        Modal.close('reschedule-modal');
        activeFilter = 'all';
        document.querySelectorAll('#fu-filter .filter-chip').forEach((c, i) => c.classList.toggle('active', i === 0));
        applyFilter();
      } catch {
        Utils.toast('Gagal menyimpan follow up', 'error');
      }
    }
  };

  // ── Create Follow Up (tanpa lead context) ──
  window.FUCreate = {
    async open() {
      const leads = await API.Leads.getAll();
      Modal.createAndOpen('fu-create-modal', '+ Follow Up Baru', `
        <div class="form-group">
          <label class="form-label">Pilih Lead *</label>
          <select class="form-control" id="fc-lead">
            <option value="">— Pilih Lead —</option>
            ${leads.map(l => `<option value="${l.id}" data-name="${l.nama}">${l.nama} (${l.area || '-'})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tanggal Follow Up *</label>
          <input type="date" class="form-control" id="fc-date" value="${Utils.today()}" min="${Utils.today()}">
        </div>
        <div class="form-group">
          <label class="form-label">Catatan</label>
          <textarea class="form-control" id="fc-note" rows="3" placeholder="Agenda follow up..."></textarea>
        </div>
        <div class="flex gap-2" style="justify-content:flex-end">
          <button class="btn btn-ghost" onclick="Modal.close('fu-create-modal')">Batal</button>
          <button class="btn btn-primary" onclick="FUCreate.save()">Simpan</button>
        </div>
      `);
    },

    async save() {
      const select = document.getElementById('fc-lead');
      const leadId = select?.value;
      const leadName = select?.options[select.selectedIndex]?.dataset.name || '';
      const date = document.getElementById('fc-date')?.value;
      const note = document.getElementById('fc-note')?.value.trim();

      if (!leadId) { Utils.toast('Pilih lead terlebih dahulu', 'warning'); return; }
      if (!date) { Utils.toast('Pilih tanggal', 'warning'); return; }

      try {
        const fu = await API.FollowUps.create({ lead_id: leadId, lead_name: leadName, next_followup: date, note });
        allFollowUps.unshift({ ...fu, lead_name: leadName, next_followup: date, note, status: 'pending' });
        Utils.toast('Follow up berhasil disimpan', 'success');
        Modal.close('fu-create-modal');
        applyFilter();
      } catch {
        Utils.toast('Gagal menyimpan follow up', 'error');
      }
    }
  };

  // ── Init ───────────────────────────────────
  await load();
})();
