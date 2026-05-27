/* ═══════════════════════════════════════════
   SALES OS — Dashboard
   KPI Cards, Hot Leads, Overdue Follow Ups
═══════════════════════════════════════════ */

(async () => {
  // ── Auth Guard ────────────────────────────
  await Auth.init();
  if (!Auth.requireAuth()) return;

  // ── Render Shell ──────────────────────────
  const user = Auth.getUser();

  // Sidebar
  document.getElementById('sidebar-container').innerHTML = Sidebar.render('dashboard');
  Sidebar.attachToggle();

  // Bottom Nav
  document.getElementById('bottom-nav-container').innerHTML = BottomNav.render('dashboard');

  // Header
  document.getElementById('header-container').innerHTML = PageHeader.render(
    'Dashboard',
    `Selamat datang, ${user.nama} 👋`,
    `<button class="btn btn-primary btn-sm" onclick="window.location.href='leads.html?action=new'">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
       + Lead
     </button>`
  );

  // Show menu btn on mobile
  const menuBtn = document.getElementById('menu-btn');
  if (menuBtn) menuBtn.style.display = '';

  // ── Load Data ─────────────────────────────
  try {
    const [stats, hotLeads, followUps] = await Promise.all([
      API.Dashboard.getStats(),
      API.Dashboard.getHotLeads(),
      API.FollowUps.getAll(),
    ]);

    const overdue = followUps.filter(f => f.status === 'pending' && Utils.isOverdue(f.next_followup));
    const todayFU = followUps.filter(f => f.status === 'pending' && Utils.isToday(f.next_followup));

    // Update sidebar badge
    if (overdue.length > 0) {
      document.getElementById('sidebar-container').innerHTML = Sidebar.render('dashboard', overdue.length);
      Sidebar.attachToggle();
    }

    renderDashboard(stats, hotLeads, overdue, todayFU);
  } catch (err) {
    console.error('Dashboard error:', err);
    Utils.toast('Gagal memuat data dashboard', 'error');
    renderDashboard({}, [], [], []);
  }

  // ── Render Dashboard ──────────────────────

  function renderDashboard(stats, hotLeads, overdue, todayFU) {
    document.getElementById('loading-state').style.display = 'none';
    const content = document.getElementById('dashboard-content');
    content.style.display = '';

    const convRate = stats.conversion_rate ? stats.conversion_rate.toFixed(1) : 0;

    content.innerHTML = `
    <!-- KPI Cards -->
    <div class="kpi-grid mb-4">
      ${kpiCard('blue', iconUsers(), 'Total Lead', stats.total_leads || 0, `+${stats.new_leads_today || 0} hari ini`, 'up')}
      ${kpiCard('green', iconCheck(), 'Total Closing', stats.total_closing || 0, `${stats.installed_this_month || 0} bulan ini`, 'up')}
      ${kpiCard('orange', iconDollar(), 'Revenue', Utils.formatCurrency(stats.revenue || 0), `${convRate}% conversion`, 'up')}
      ${kpiCard('red', iconBell(), 'Overdue Follow Up', overdue.length, overdue.length > 0 ? 'Perlu tindak lanjut!' : 'Semua oke ✓', overdue.length > 0 ? 'down' : 'up')}
      ${kpiCard('purple', iconFire(), 'Hot Leads', stats.hot_leads || hotLeads.length, 'Score ≥ 75', 'up')}
      ${kpiCard('green', iconSignal(), 'Installed Bulan Ini', stats.installed_this_month || 0, 'Sudah aktif', 'up')}
    </div>

    <!-- Pipeline Summary -->
    <div class="card mb-4">
      <div class="section-header">
        <span class="section-title">📊 Pipeline Overview</span>
        <a href="pipeline.html" class="btn btn-ghost btn-sm">Lihat Semua →</a>
      </div>
      <div id="pipeline-summary">
        <div class="flex gap-2" style="overflow-x:auto;padding-bottom:4px">
          ${CONFIG.PIPELINE_STAGES.filter(s => s.id !== 'lost').map(s => `
            <div style="flex-shrink:0;text-align:center;padding:12px 16px;background:var(--navy-3);border-radius:var(--radius);border:1px solid var(--border);min-width:80px">
              <div style="font-size:18px;margin-bottom:4px">${s.icon}</div>
              <div style="font-size:18px;font-weight:800;color:${s.color}">—</div>
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;font-weight:600;margin-top:2px">${s.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="grid-2">
      <!-- Overdue Follow Ups -->
      <div>
        <div class="section-header">
          <span class="section-title">⚠️ Overdue Follow Up</span>
          <a href="followup.html" class="btn btn-ghost btn-sm">Semua →</a>
        </div>
        <div id="overdue-list">
          ${overdue.length === 0
            ? `<div class="card" style="text-align:center;padding:24px;color:var(--text-muted)">
                <div style="font-size:24px;margin-bottom:8px">✅</div>
                <p class="text-sm">Tidak ada follow up overdue</p>
               </div>`
            : overdue.slice(0, 4).map(fu => renderFollowUpCard(fu, 'overdue')).join('')
          }
        </div>
      </div>

      <!-- Hot Leads -->
      <div>
        <div class="section-header">
          <span class="section-title">🔥 Hot Leads</span>
          <a href="leads.html?filter=hot" class="btn btn-ghost btn-sm">Semua →</a>
        </div>
        <div id="hot-leads-list">
          ${hotLeads.length === 0
            ? `<div class="card" style="text-align:center;padding:24px;color:var(--text-muted)">
                <div style="font-size:24px;margin-bottom:8px">📊</div>
                <p class="text-sm">Belum ada hot lead</p>
               </div>`
            : hotLeads.slice(0, 4).map(lead => LeadCard.render(lead, { showActions: false })).join('')
          }
        </div>
      </div>
    </div>

    <!-- Today's Follow Ups -->
    ${todayFU.length > 0 ? `
    <div class="mt-4">
      <div class="section-header">
        <span class="section-title">📅 Follow Up Hari Ini (${todayFU.length})</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${todayFU.slice(0, 3).map(fu => renderFollowUpCard(fu, 'today')).join('')}
      </div>
    </div>` : ''}
    `;

    // Load pipeline counts
    API.Analytics.getPipelineCount().then(counts => {
      const stages = CONFIG.PIPELINE_STAGES.filter(s => s.id !== 'lost');
      const summaryEl = document.getElementById('pipeline-summary');
      if (summaryEl) {
        summaryEl.innerHTML = `<div class="flex gap-2" style="overflow-x:auto;padding-bottom:4px">
          ${stages.map(s => `
            <div style="flex-shrink:0;text-align:center;padding:12px 16px;background:var(--navy-3);border-radius:var(--radius);border:1px solid var(--border);min-width:80px;cursor:pointer" onclick="window.location.href='pipeline.html'">
              <div style="font-size:18px;margin-bottom:4px">${s.icon}</div>
              <div style="font-size:20px;font-weight:800;color:${s.color}">${counts[s.id] || 0}</div>
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;font-weight:600;margin-top:2px">${s.label}</div>
            </div>
          `).join('')}
        </div>`;
      }
    });
  }

  // ── Sub Components ────────────────────────

  function kpiCard(color, icon, label, value, subtitle, trend) {
    return `
    <div class="kpi-card ${color}">
      <div class="kpi-icon ${color}">${icon}</div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-change ${trend}">
        ${trend === 'up' ? '↑' : '↓'} ${subtitle}
      </div>
    </div>`;
  }

  function renderFollowUpCard(fu, type = '') {
    const dm = Utils.getDayMonth(fu.next_followup);
    const days = Utils.daysUntil(fu.next_followup);
    const daysText = days === null ? '' : days < 0 ? `${Math.abs(days)} hari lalu` : days === 0 ? 'Hari ini' : `${days} hari lagi`;

    return `
    <div class="followup-card followup-${type}" style="margin-bottom:8px">
      <div class="followup-date-box">
        <div class="followup-day">${dm.day}</div>
        <div class="followup-month">${dm.month}</div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:14px">${Utils.truncate(fu.lead_name || fu.nama || '—', 28)}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">📍 ${fu.lead_area || fu.area || '-'} · ${Utils.getBadgeHTML(fu.lead_status || fu.status || 'cold')}</div>
        ${fu.note ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:4px">📝 ${Utils.truncate(fu.note, 40)}</div>` : ''}
        <div style="font-size:11px;margin-top:6px;color:${type === 'overdue' ? 'var(--red)' : 'var(--yellow)'};font-weight:600">${daysText}</div>
      </div>
      <div style="flex-shrink:0">
        <a href="${Utils.waLink(fu.lead_wa || fu.no_wa || '')}" target="_blank" class="btn-wa" style="font-size:11px;padding:6px 10px">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:12px;height:12px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.524 5.847L.057 23.882a.5.5 0 00.61.61l6.12-1.528A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.665-.52-5.18-1.427l-.37-.22-3.83.956.975-3.764-.24-.386A10 10 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
          WA
        </a>
      </div>
    </div>`;
  }

  // ── SVG Icons ─────────────────────────────
  function iconUsers()  { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`; }
  function iconCheck()  { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:20px;height:20px"><polyline points="20 6 9 17 4 12"/></svg>`; }
  function iconDollar() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`; }
  function iconBell()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`; }
  function iconFire()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M12 2c0 6-6 8-6 14a6 6 0 0012 0c0-6-6-8-6-14z"/><path d="M12 2c0 4 3 6 3 10a3 3 0 01-6 0c0-4 3-6 3-10z"/></svg>`; }
  function iconSignal() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M10.54 17.1a3 3 0 012.9 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`; }

})();
