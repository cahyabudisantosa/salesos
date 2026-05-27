/* ═══════════════════════════════════════════
   SALES OS — Reusable Components
   navbar, sidebar, leadCard, modal
═══════════════════════════════════════════ */

// ══════════════════════════════════════════
// SIDEBAR COMPONENT
// ══════════════════════════════════════════

const Sidebar = (() => {
  const ICON = {
    dashboard:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    leads:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
    pipeline:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    followup:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>`,
    analytics:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    logout:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  };

  function render(activePage = 'dashboard', overdueCount = 0) {
    const user = Auth.getUser() || {};
    return `
    <div class="sidebar" id="sidebar">
      <div class="logo">
        <div class="logo-icon">SO</div>
        <div>
          <div class="logo-text">Sales OS</div>
          <div class="logo-sub">ISP System</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-label">Menu Utama</div>

        <a href="dashboard.html" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}">
          ${ICON.dashboard} Dashboard
        </a>
        <a href="leads.html" class="nav-item ${activePage === 'leads' ? 'active' : ''}">
          ${ICON.leads} Leads
        </a>
        <a href="pipeline.html" class="nav-item ${activePage === 'pipeline' ? 'active' : ''}">
          ${ICON.pipeline} Pipeline
        </a>
        <a href="followup.html" class="nav-item ${activePage === 'followup' ? 'active' : ''}">
          ${ICON.followup} Follow Up
          ${overdueCount > 0 ? `<span class="nav-badge">${overdueCount}</span>` : ''}
        </a>

        ${user.role === 'owner' || user.role === 'admin' ? `
        <div class="nav-section-label">Owner</div>
        <a href="analytics.html" class="nav-item ${activePage === 'analytics' ? 'active' : ''}">
          ${ICON.analytics} Analytics & KPI
        </a>` : ''}
      </nav>

      <div class="sidebar-footer">
        <div class="user-card" onclick="Auth.logout()">
          <div class="user-avatar">${Utils.initials(user.nama)}</div>
          <div class="user-info">
            <div class="user-name">${user.nama || 'User'}</div>
            <div class="user-role">${user.role || 'sales'} · ${user.area || ''}</div>
          </div>
          ${ICON.logout}
        </div>
      </div>
    </div>`;
  }

  function attachToggle() {
    // Sidebar toggle for mobile
    const btn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (btn) btn.addEventListener('click', () => {
      sidebar?.classList.toggle('open');
      overlay?.classList.toggle('open');
    });

    if (overlay) overlay.addEventListener('click', () => {
      sidebar?.classList.remove('open');
      overlay?.classList.remove('open');
    });
  }

  return { render, attachToggle };
})();


// ══════════════════════════════════════════
// PAGE HEADER COMPONENT
// ══════════════════════════════════════════

const PageHeader = {
  render(title, subtitle = '', actions = '') {
    return `
    <div class="page-header">
      <div class="flex items-center gap-3">
        <button class="btn-icon" id="menu-btn" style="display:none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div>
          <h1 style="font-size:17px;font-weight:800;letter-spacing:-0.3px">${title}</h1>
          ${subtitle ? `<p class="text-xs text-muted mt-1">${subtitle}</p>` : ''}
        </div>
      </div>
      <div class="flex items-center gap-2">${actions}</div>
    </div>`;
  }
};


// ══════════════════════════════════════════
// LEAD CARD COMPONENT
// ══════════════════════════════════════════

const LeadCard = {
  render(lead, opts = {}) {
    const { showActions = true, compact = false } = opts;
    const score = lead.score || Utils.calcScore(lead);
    const scoreColor = Utils.getScoreColor(score);
    const dm = Utils.getDayMonth(lead.created_at);

    return `
    <div class="lead-card fade-in" data-id="${lead.id}" onclick="LeadDetail.open('${lead.id}')">
      <div class="lead-card-header">
        <div style="flex:1;min-width:0">
          <div class="flex items-center gap-2">
            <div class="user-avatar" style="width:32px;height:32px;font-size:12px;border-radius:8px;flex-shrink:0">
              ${Utils.initials(lead.nama)}
            </div>
            <div style="min-width:0">
              <div class="lead-name">${Utils.truncate(lead.nama, 24)}</div>
              <div class="lead-area">📍 ${lead.area || '-'}</div>
            </div>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${Utils.getBadgeHTML(lead.status)}
          <div class="lead-score" style="color:${scoreColor};margin-top:4px">${score}pt</div>
        </div>
      </div>

      <div class="score-bar">
        <div class="score-bar-fill" style="width:${score}%"></div>
      </div>

      <div class="lead-meta">
        <span class="text-xs text-muted">📱 ${lead.no_wa || '-'}</span>
        <span class="text-xs text-muted">·</span>
        <span class="text-xs text-muted">🔗 ${lead.source || '-'}</span>
        ${lead.note ? `<span class="text-xs text-muted">· 📝 ${Utils.truncate(lead.note, 30)}</span>` : ''}
      </div>

      ${showActions ? `
      <div class="flex gap-2 mt-3" onclick="event.stopPropagation()">
        <a href="${Utils.waLink(lead.no_wa, CONFIG.WA_TEMPLATES.followup(lead.nama))}"
           target="_blank" class="btn-wa" style="font-size:11px;padding:5px 10px">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.524 5.847L.057 23.882a.5.5 0 00.61.61l6.12-1.528A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.665-.52-5.18-1.427l-.37-.22-3.83.956.975-3.764-.24-.386A10 10 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
          WA
        </a>
        <button class="btn btn-sm btn-ghost" onclick="LeadModal.openEdit('${lead.id}')">Edit</button>
        <button class="btn btn-sm btn-ghost" onclick="FollowUpModal.open('${lead.id}', '${lead.nama}')">+ Follow Up</button>
      </div>` : ''}
    </div>`;
  },

  renderSkeleton() {
    return `
    <div class="lead-card">
      <div class="flex gap-2 items-center mb-3">
        <div class="skeleton" style="width:32px;height:32px;border-radius:8px"></div>
        <div style="flex:1">
          <div class="skeleton" style="height:14px;width:60%;border-radius:4px;margin-bottom:6px"></div>
          <div class="skeleton" style="height:11px;width:40%;border-radius:4px"></div>
        </div>
      </div>
      <div class="skeleton" style="height:3px;border-radius:3px;margin-bottom:10px"></div>
      <div class="skeleton" style="height:11px;width:80%;border-radius:4px"></div>
    </div>`;
  }
};


// ══════════════════════════════════════════
// MODAL COMPONENT
// ══════════════════════════════════════════

const Modal = (() => {
  function create(id, title, contentHTML, footerHTML = '') {
    // Remove jika sudah ada
    document.getElementById(id)?.remove();

    const html = `
    <div class="modal-overlay" id="${id}">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <button class="modal-close" onclick="Modal.close('${id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">${contentHTML}</div>
        ${footerHTML ? `<div class="modal-footer" style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end">${footerHTML}</div>` : ''}
      </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    const overlay = document.getElementById(id);

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(id);
    });

    // Close on ESC
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { close(id); document.removeEventListener('keydown', handler); }
    });

    return overlay;
  }

  function open(id) {
    const overlay = document.getElementById(id);
    if (overlay) {
      requestAnimationFrame(() => overlay.classList.add('open'));
    }
  }

  function close(id) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 350);
    }
  }

  function createAndOpen(id, title, contentHTML, footerHTML = '') {
    create(id, title, contentHTML, footerHTML);
    setTimeout(() => open(id), 10);
  }

  function setContent(id, html) {
    const body = document.querySelector(`#${id} .modal-body`);
    if (body) body.innerHTML = html;
  }

  function setTitle(id, title) {
    const el = document.querySelector(`#${id} .modal-title`);
    if (el) el.textContent = title;
  }

  return { create, open, close, createAndOpen, setContent, setTitle };
})();


// ══════════════════════════════════════════
// BOTTOM NAV COMPONENT
// ══════════════════════════════════════════

const BottomNav = {
  render(active = 'dashboard') {
    const items = [
      { id: 'dashboard', label: 'Home', href: 'dashboard.html', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>` },
      { id: 'leads',    label: 'Leads',    href: 'leads.html',    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` },
      { id: 'pipeline', label: 'Pipeline', href: 'pipeline.html', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` },
      { id: 'followup', label: 'Follow Up',href: 'followup.html', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>` },
      { id: 'analytics',label: 'KPI',      href: 'analytics.html',icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>` },
    ];

    return `
    <nav class="bottom-nav" id="bottom-nav">
      ${items.map(item => `
        <a href="${item.href}" class="bottom-nav-item ${active === item.id ? 'active' : ''}">
          ${item.icon}
          <span>${item.label}</span>
        </a>
      `).join('')}
    </nav>`;
  }
};
