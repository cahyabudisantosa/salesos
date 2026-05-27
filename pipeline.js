/* ═══════════════════════════════════════════
   SALES OS — Pipeline Kanban
   Drag & Drop, Status Update
═══════════════════════════════════════════ */

(async () => {
  await Auth.init();
  if (!Auth.requireAuth()) return;

  const user = Auth.getUser();
  let allLeads = [];
  let draggedCard = null;
  let draggedLeadId = null;

  // ── Shell ──────────────────────────────────
  document.getElementById('sidebar-container').innerHTML = Sidebar.render('pipeline');
  Sidebar.attachToggle();
  document.getElementById('bottom-nav-container').innerHTML = BottomNav.render('pipeline');
  document.getElementById('header-container').innerHTML = PageHeader.render(
    'Pipeline',
    'Visual status semua lead',
    `<button class="btn btn-primary btn-sm" onclick="window.location.href='leads.html?action=new'">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
       + Lead
     </button>`
  );
  document.getElementById('menu-btn').style.display = '';

  // ── Load ───────────────────────────────────
  try {
    allLeads = await API.Leads.getAll();
    renderBoard();
  } catch (err) {
    Utils.toast('Gagal memuat pipeline', 'error');
    console.error(err);
  }

  // ── Render Board ───────────────────────────
  function renderBoard() {
    const board = document.getElementById('pipeline-board');
    board.innerHTML = CONFIG.PIPELINE_STAGES.map(stage => renderColumn(stage)).join('');
    attachDragEvents();
  }

  function renderColumn(stage) {
    const leads = allLeads.filter(l => l.status === stage.id);
    const totalRevenue = stage.id === 'installed'
      ? leads.length * 99000 // estimate per installed
      : null;

    return `
    <div class="pipeline-col" data-stage="${stage.id}">
      <div class="pipeline-col-header" style="background:${stage.color}22;border:1px solid ${stage.color}44;color:${stage.color}">
        <span>${stage.icon} ${stage.label}</span>
        <span style="background:${stage.color}33;padding:2px 8px;border-radius:12px;font-size:12px">${leads.length}</span>
      </div>
      <div class="pipeline-cards" data-stage="${stage.id}" id="col-${stage.id}">
        ${leads.length === 0
          ? `<div style="text-align:center;padding:24px 10px;color:var(--text-muted);font-size:12px">Drop lead di sini</div>`
          : leads.map(lead => renderPipelineCard(lead, stage)).join('')
        }
      </div>
      ${totalRevenue ? `<div style="text-align:center;padding:6px;font-size:11px;color:var(--green);font-weight:700;font-family:var(--font-mono)">${Utils.formatCurrency(totalRevenue)}</div>` : ''}
    </div>`;
  }

  function renderPipelineCard(lead, stage) {
    const score = lead.score || Utils.calcScore(lead);
    const scoreColor = Utils.getScoreColor(score);
    return `
    <div class="pipeline-card" draggable="true" data-id="${lead.id}" data-stage="${stage.id}"
         onclick="PipelineDetail.open('${lead.id}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div style="font-weight:700;font-size:13px;flex:1;min-width:0">${Utils.truncate(lead.nama, 22)}</div>
        <span style="font-family:var(--font-mono);font-size:11px;color:${scoreColor};font-weight:700;margin-left:6px">${score}pt</span>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">📍 ${lead.area || '-'}</div>
      <div style="font-size:11px;color:var(--text-muted)">📱 ${lead.no_wa ? lead.no_wa.slice(0, 4) + '****' : '-'}</div>
      <div style="height:2px;background:var(--navy-4);border-radius:2px;margin-top:8px;overflow:hidden">
        <div style="height:100%;width:${score}%;background:linear-gradient(90deg,${stage.color},${scoreColor});border-radius:2px"></div>
      </div>
      <div style="display:flex;gap:5px;margin-top:8px" onclick="event.stopPropagation()">
        <a href="${Utils.waLink(lead.no_wa)}" target="_blank" class="btn-wa" style="font-size:10px;padding:4px 8px">WA</a>
      </div>
    </div>`;
  }

  // ── Drag & Drop ────────────────────────────
  function attachDragEvents() {
    // Cards
    document.querySelectorAll('.pipeline-card').forEach(card => {
      card.addEventListener('dragstart', onDragStart);
      card.addEventListener('dragend', onDragEnd);
      // Touch support
      card.addEventListener('touchstart', onTouchStart, { passive: true });
      card.addEventListener('touchmove', onTouchMove, { passive: false });
      card.addEventListener('touchend', onTouchEnd);
    });

    // Drop zones
    document.querySelectorAll('.pipeline-cards').forEach(col => {
      col.addEventListener('dragover', onDragOver);
      col.addEventListener('dragleave', onDragLeave);
      col.addEventListener('drop', onDrop);
    });
  }

  function onDragStart(e) {
    draggedCard = e.currentTarget;
    draggedLeadId = draggedCard.dataset.id;
    draggedCard.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedLeadId);
  }

  function onDragEnd(e) {
    draggedCard?.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    draggedCard = null;
    draggedLeadId = null;
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  }

  function onDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      e.currentTarget.classList.remove('drag-over');
    }
  }

  async function onDrop(e) {
    e.preventDefault();
    const col = e.currentTarget;
    col.classList.remove('drag-over');

    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    const newStage = col.dataset.stage;
    if (!leadId || !newStage) return;

    const lead = allLeads.find(l => l.id === leadId);
    if (!lead || lead.status === newStage) return;

    const oldStage = lead.status;
    lead.status = newStage;

    // Optimistic update
    renderBoard();

    try {
      await API.Leads.updateStatus(leadId, newStage);
      // Log activity
      await API.Activities.create({
        lead_id: leadId,
        activity_type: 'note',
        note: `Status diubah dari ${Utils.getStage(oldStage).label} ke ${Utils.getStage(newStage).label}`,
        created_by: user.nama,
      });
      Utils.toast(`${lead.nama} → ${Utils.getStage(newStage).label}`, 'success');
    } catch {
      // Revert
      lead.status = oldStage;
      renderBoard();
      Utils.toast('Gagal mengubah status', 'error');
    }
  }

  // ── Touch Drag (Mobile) ───────────────────
  let touchCard = null;
  let touchGhost = null;
  let touchLeadId = null;

  function onTouchStart(e) {
    touchCard = e.currentTarget;
    touchLeadId = touchCard.dataset.id;
  }

  function onTouchMove(e) {
    if (!touchCard) return;
    e.preventDefault();
    const touch = e.touches[0];

    if (!touchGhost) {
      touchGhost = touchCard.cloneNode(true);
      touchGhost.style.cssText = `position:fixed;opacity:0.8;pointer-events:none;z-index:999;width:${touchCard.offsetWidth}px;box-shadow:0 8px 32px rgba(0,0,0,0.4)`;
      document.body.appendChild(touchGhost);
    }

    touchGhost.style.left = (touch.clientX - touchCard.offsetWidth / 2) + 'px';
    touchGhost.style.top = (touch.clientY - 40) + 'px';

    // Highlight drop zones
    document.querySelectorAll('.pipeline-cards').forEach(col => {
      const r = col.getBoundingClientRect();
      if (touch.clientX >= r.left && touch.clientX <= r.right &&
          touch.clientY >= r.top && touch.clientY <= r.bottom) {
        col.classList.add('drag-over');
      } else {
        col.classList.remove('drag-over');
      }
    });
  }

  async function onTouchEnd(e) {
    if (!touchCard) return;
    const touch = e.changedTouches[0];

    // Find drop target
    document.querySelectorAll('.pipeline-cards').forEach(col => col.classList.remove('drag-over'));
    if (touchGhost) { touchGhost.remove(); touchGhost = null; }

    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropZone = el?.closest('.pipeline-cards');
    if (dropZone && touchLeadId) {
      const fakeEvent = { preventDefault: () => {}, dataTransfer: { getData: () => touchLeadId }, currentTarget: dropZone };
      await onDrop(fakeEvent);
    }

    touchCard = null;
    touchLeadId = null;
  }


  // ── Pipeline Card Detail (Quick Modal) ────
  window.PipelineDetail = {
    open(id) {
      const lead = allLeads.find(l => l.id === id);
      if (!lead) return;
      const stage = Utils.getStage(lead.status);

      Modal.createAndOpen('pipe-detail', lead.nama, `
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:32px;margin-bottom:8px">${stage.icon}</div>
          ${Utils.getBadgeHTML(lead.status)}
        </div>
        <div class="grid-2 mb-4">
          <div style="background:var(--navy-3);border-radius:var(--radius);padding:12px;border:1px solid var(--border)">
            <div class="text-xs text-muted" style="font-weight:700;text-transform:uppercase;margin-bottom:4px">WhatsApp</div>
            <div style="font-weight:600">${lead.no_wa || '-'}</div>
          </div>
          <div style="background:var(--navy-3);border-radius:var(--radius);padding:12px;border:1px solid var(--border)">
            <div class="text-xs text-muted" style="font-weight:700;text-transform:uppercase;margin-bottom:4px">Area</div>
            <div style="font-weight:600">${lead.area || '-'}</div>
          </div>
        </div>
        ${lead.note ? `<div class="card card-sm mb-4"><p class="text-sm">${lead.note}</p></div>` : ''}
        <div style="margin-bottom:12px">
          <div class="text-xs text-muted" style="font-weight:700;text-transform:uppercase;margin-bottom:8px">Pindah ke Stage</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${CONFIG.PIPELINE_STAGES.map(s => `
              <button onclick="PipelineDetail.moveTo('${lead.id}','${s.id}')"
                class="filter-chip ${lead.status === s.id ? 'active' : ''}" style="font-size:11px">
                ${s.icon} ${s.label}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="flex gap-2" style="flex-wrap:wrap">
          <a href="${Utils.waLink(lead.no_wa, CONFIG.WA_TEMPLATES.followup(lead.nama))}" target="_blank" class="btn-wa">WA Follow Up</a>
          <a href="leads.html" class="btn btn-sm btn-ghost">Lihat Detail →</a>
        </div>
      `);
    },

    async moveTo(leadId, newStage) {
      const lead = allLeads.find(l => l.id === leadId);
      if (!lead || lead.status === newStage) { Modal.close('pipe-detail'); return; }
      const old = lead.status;
      lead.status = newStage;
      Modal.close('pipe-detail');
      renderBoard();
      try {
        await API.Leads.updateStatus(leadId, newStage);
        Utils.toast(`${lead.nama} → ${Utils.getStage(newStage).label}`, 'success');
      } catch {
        lead.status = old;
        renderBoard();
        Utils.toast('Gagal mengubah status', 'error');
      }
    }
  };

})();
