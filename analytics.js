/* ═══════════════════════════════════════════
   SALES OS — Analytics & KPI
   Pipeline Chart, Trend, Leaderboard
═══════════════════════════════════════════ */

(async () => {
  await Auth.init();
  if (!Auth.requireAuth()) return;

  const user = Auth.getUser();

  // Owner/Admin only page
  if (!Auth.isOwner()) {
    document.getElementById('analytics-body').innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:56px;height:56px;margin:0 auto 16px;opacity:.4"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        <h3>Akses Terbatas</h3>
        <p>Halaman ini hanya untuk Owner / Admin</p>
      </div>`;
    return;
  }

  // ── Shell ──────────────────────────────────
  document.getElementById('sidebar-container').innerHTML = Sidebar.render('analytics');
  Sidebar.attachToggle();
  document.getElementById('bottom-nav-container').innerHTML = BottomNav.render('analytics');
  document.getElementById('header-container').innerHTML = PageHeader.render(
    'Analytics & KPI',
    'Performa tim sales ISP',
    `<select class="form-control" id="period-filter" style="width:auto;font-size:13px">
       <option value="all">Semua Periode</option>
       <option value="month" selected>Bulan Ini</option>
       <option value="quarter">3 Bulan</option>
     </select>`
  );
  document.getElementById('menu-btn').style.display = '';

  // ── Load Data ─────────────────────────────
  try {
    const [stats, kpiList, pipelineCount, trend] = await Promise.all([
      API.Dashboard.getStats(),
      API.Analytics.getKPI(),
      API.Analytics.getPipelineCount(),
      API.Analytics.getMonthlyTrend(),
    ]);
    renderAll(stats, kpiList, pipelineCount, trend);
  } catch (err) {
    Utils.toast('Gagal memuat analytics', 'error');
    console.error(err);
  }

  // ── Render All ────────────────────────────
  function renderAll(stats, kpiList, pipelineCount, trend) {
    const body = document.getElementById('analytics-body');
    const totalLead = Object.values(pipelineCount).reduce((a, b) => a + b, 0);

    body.innerHTML = `

    <!-- Summary KPIs -->
    <div class="kpi-grid mb-4">
      <div class="kpi-card blue">
        <div class="kpi-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div>
        <div class="kpi-value">${stats.total_leads || totalLead}</div>
        <div class="kpi-label">Total Lead</div>
        <div class="kpi-change up">↑ Bulan ini</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:20px;height:20px"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div class="kpi-value">${stats.total_closing || 0}</div>
        <div class="kpi-label">Total Closing</div>
        <div class="kpi-change up">↑ ${stats.conversion_rate?.toFixed(1) || 0}% conv. rate</div>
      </div>
      <div class="kpi-card orange">
        <div class="kpi-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
        <div class="kpi-value" style="font-size:20px">${Utils.formatCurrency(stats.revenue || 0)}</div>
        <div class="kpi-label">Total Revenue</div>
        <div class="kpi-change up">↑ Bulan ini</div>
      </div>
      <div class="kpi-card purple">
        <div class="kpi-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
        <div class="kpi-value">${stats.installed_this_month || 0}</div>
        <div class="kpi-label">Installed Bulan Ini</div>
        <div class="kpi-change up">↑ Target tercapai</div>
      </div>
    </div>

    <!-- Pipeline Distribution -->
    <div class="card mb-4">
      <div class="section-header">
        <span class="section-title">📊 Distribusi Pipeline</span>
        <span class="text-sm text-muted">${totalLead} total lead</span>
      </div>
      <div id="pipeline-chart" style="margin-bottom:16px"></div>
      <div style="display:flex;flex-wrap:wrap;gap:8px" id="pipeline-legend"></div>
    </div>

    <!-- Monthly Trend -->
    <div class="card mb-4">
      <div class="section-header">
        <span class="section-title">📈 Trend Bulanan</span>
      </div>
      <div id="trend-chart" style="height:160px;position:relative"></div>
    </div>

    <!-- Conversion Funnel -->
    <div class="card mb-4">
      <div class="section-header">
        <span class="section-title">🎯 Conversion Funnel</span>
      </div>
      <div id="funnel-chart"></div>
    </div>

    <!-- Sales Leaderboard -->
    <div class="card mb-4">
      <div class="section-header">
        <span class="section-title">🏆 Leaderboard Sales</span>
      </div>
      <div id="leaderboard"></div>
    </div>
    `;

    renderPipelineChart(pipelineCount, totalLead);
    renderTrend(trend);
    renderFunnel(pipelineCount);
    renderLeaderboard(kpiList);
  }

  // ── Pipeline Chart (SVG Bar) ───────────────
  function renderPipelineChart(counts, total) {
    const stages = CONFIG.PIPELINE_STAGES;
    const max = Math.max(...stages.map(s => counts[s.id] || 0), 1);

    const bars = stages.map(s => {
      const val = counts[s.id] || 0;
      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
      const barW = max > 0 ? (val / max) * 100 : 0;

      return `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="width:90px;flex-shrink:0;display:flex;align-items:center;gap:6px">
          <span style="font-size:13px">${s.icon}</span>
          <span style="font-size:12px;font-weight:600;color:var(--text-secondary)">${s.label}</span>
        </div>
        <div style="flex:1;background:var(--navy-3);border-radius:4px;height:22px;overflow:hidden;position:relative">
          <div style="width:${barW}%;height:100%;background:${s.color};border-radius:4px;transition:width 0.8s ease;display:flex;align-items:center;padding:0 8px;min-width:${val>0?'30px':'0'}">
            ${val > 0 ? `<span style="font-size:11px;font-weight:700;color:white">${val}</span>` : ''}
          </div>
        </div>
        <div style="width:50px;text-align:right;font-size:12px;color:var(--text-muted);font-family:var(--font-mono)">${pct}%</div>
      </div>`;
    }).join('');

    document.getElementById('pipeline-chart').innerHTML = bars;

    // Legend
    document.getElementById('pipeline-legend').innerHTML = stages.map(s => `
      <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-muted)">
        <div style="width:8px;height:8px;border-radius:2px;background:${s.color}"></div>
        ${s.label}: <strong style="color:var(--text-primary)">${counts[s.id] || 0}</strong>
      </div>`).join('');
  }

  // ── Monthly Trend (SVG Line Chart) ────────
  function renderTrend(trend) {
    if (!trend || trend.length === 0) return;

    const W = 600, H = 140, PAD = { top: 10, right: 20, bottom: 30, left: 40 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    const maxLeads = Math.max(...trend.map(t => t.leads || 0), 1);
    const maxClose = Math.max(...trend.map(t => t.closing || 0), 1);

    function xPos(i) { return PAD.left + (i / (trend.length - 1)) * chartW; }
    function yLeads(v) { return PAD.top + chartH - (v / maxLeads) * chartH; }
    function yClose(v) { return PAD.top + chartH - (v / maxClose) * chartH; }

    const leadPoints = trend.map((t, i) => `${xPos(i)},${yLeads(t.leads || 0)}`).join(' ');
    const closePoints = trend.map((t, i) => `${xPos(i)},${yClose(t.closing || 0)}`).join(' ');

    const leadPath = trend.map((t, i) => `${i === 0 ? 'M' : 'L'}${xPos(i)},${yLeads(t.leads || 0)}`).join(' ');
    const closePath = trend.map((t, i) => `${i === 0 ? 'M' : 'L'}${xPos(i)},${yClose(t.closing || 0)}`).join(' ');

    const svg = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;overflow:visible">
      <!-- Grid lines -->
      ${[0, 0.25, 0.5, 0.75, 1].map(p => `
        <line x1="${PAD.left}" y1="${PAD.top + chartH * p}" x2="${W - PAD.right}" y2="${PAD.top + chartH * p}"
          stroke="var(--border)" stroke-dasharray="4,4" stroke-width="1"/>
      `).join('')}

      <!-- Leads area fill -->
      <path d="${leadPath} L${xPos(trend.length - 1)},${PAD.top + chartH} L${xPos(0)},${PAD.top + chartH} Z"
        fill="url(#leadGrad)" opacity="0.3"/>

      <!-- Leads line -->
      <path d="${leadPath}" fill="none" stroke="var(--blue-light)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>

      <!-- Closing line -->
      <path d="${closePath}" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="0"/>

      <!-- Dots Leads -->
      ${trend.map((t, i) => `<circle cx="${xPos(i)}" cy="${yLeads(t.leads || 0)}" r="4" fill="var(--blue-light)" stroke="var(--navy-2)" stroke-width="2"/>`).join('')}

      <!-- Dots Closing -->
      ${trend.map((t, i) => `<circle cx="${xPos(i)}" cy="${yClose(t.closing || 0)}" r="4" fill="var(--green)" stroke="var(--navy-2)" stroke-width="2"/>`).join('')}

      <!-- X Labels -->
      ${trend.map((t, i) => `<text x="${xPos(i)}" y="${H - 5}" text-anchor="middle" fill="var(--text-muted)" font-size="11" font-family="var(--font)">${t.month}</text>`).join('')}

      <!-- Gradient -->
      <defs>
        <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--blue)" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="var(--blue)" stop-opacity="0"/>
        </linearGradient>
      </defs>
    </svg>

    <!-- Legend -->
    <div style="display:flex;gap:16px;margin-top:8px;justify-content:center">
      <div style="display:flex;align-items:center;gap:6px;font-size:12px">
        <div style="width:20px;height:2px;background:var(--blue-light);border-radius:2px"></div>
        <span style="color:var(--text-muted)">Lead Masuk</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;font-size:12px">
        <div style="width:20px;height:2px;background:var(--green);border-radius:2px"></div>
        <span style="color:var(--text-muted)">Closing</span>
      </div>
    </div>`;

    document.getElementById('trend-chart').style.height = 'auto';
    document.getElementById('trend-chart').innerHTML = svg;
  }

  // ── Conversion Funnel ─────────────────────
  function renderFunnel(counts) {
    const stages = CONFIG.PIPELINE_STAGES.filter(s => s.id !== 'lost');
    const maxVal = Math.max(...stages.map(s => counts[s.id] || 0), 1);

    const html = stages.map((s, i) => {
      const val = counts[s.id] || 0;
      const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
      const minW = 30;
      const w = minW + pct * (100 - minW) / 100;

      return `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <div style="width:80px;font-size:11px;color:var(--text-muted);text-align:right;flex-shrink:0">${s.icon} ${s.label}</div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center">
          <div style="width:${w}%;background:${s.color};border-radius:6px;padding:6px 12px;text-align:center;transition:width 0.8s ease;min-height:28px;display:flex;align-items:center;justify-content:center">
            <span style="font-size:13px;font-weight:700;color:white">${val}</span>
          </div>
        </div>
        ${i < stages.length - 1 && (counts[stages[i + 1].id] || 0) > 0 && val > 0 ? `
        <div style="width:80px;font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">
          → ${((( counts[stages[i+1].id] || 0) / val) * 100).toFixed(0)}%
        </div>` : '<div style="width:80px"></div>'}
      </div>`;
    }).join('');

    document.getElementById('funnel-chart').innerHTML = html;
  }

  // ── Sales Leaderboard ─────────────────────
  function renderLeaderboard(kpiList) {
    if (!kpiList || kpiList.length === 0) {
      document.getElementById('leaderboard').innerHTML = `<p class="text-sm text-muted" style="text-align:center;padding:20px">Belum ada data KPI</p>`;
      return;
    }

    const sorted = [...kpiList].sort((a, b) => (b.total_closing || 0) - (a.total_closing || 0));
    const medals = ['🥇', '🥈', '🥉'];

    const html = `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Sales</th>
            <th style="text-align:right">Lead</th>
            <th style="text-align:right">Closing</th>
            <th style="text-align:right">Conv. Rate</th>
            <th style="text-align:right">Revenue</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((kpi, i) => {
            const cr = kpi.conversion_rate || (kpi.total_lead > 0 ? ((kpi.total_closing / kpi.total_lead) * 100).toFixed(1) : 0);
            const maxClosing = sorted[0].total_closing || 1;
            const barW = ((kpi.total_closing || 0) / maxClosing) * 100;

            return `
            <tr>
              <td style="font-size:18px">${medals[i] || (i + 1)}</td>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div class="user-avatar" style="width:32px;height:32px;font-size:12px;border-radius:8px;flex-shrink:0">
                    ${Utils.initials(kpi.sales_name || 'S')}
                  </div>
                  <div>
                    <div style="font-weight:600;font-size:13px">${kpi.sales_name || kpi.sales_id}</div>
                    <div style="margin-top:4px;height:4px;width:80px;background:var(--navy-4);border-radius:4px;overflow:hidden">
                      <div style="height:100%;width:${barW}%;background:var(--green);border-radius:4px"></div>
                    </div>
                  </div>
                </div>
              </td>
              <td style="text-align:right;font-family:var(--font-mono);font-size:13px">${kpi.total_lead || 0}</td>
              <td style="text-align:right;font-family:var(--font-mono);font-size:13px;color:var(--green);font-weight:700">${kpi.total_closing || 0}</td>
              <td style="text-align:right">
                <span class="badge ${parseFloat(cr) >= 25 ? 'badge-installed' : parseFloat(cr) >= 15 ? 'badge-negotiation' : 'badge-cold'}">${cr}%</span>
              </td>
              <td style="text-align:right;font-size:13px;color:var(--orange);font-weight:600;white-space:nowrap">${Utils.formatCurrency(kpi.revenue || 0)}</td>
              <td>
                <button class="btn btn-ghost btn-sm" onclick="KPIDetail.open('${kpi.sales_id}','${kpi.sales_name}')">Detail</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;

    document.getElementById('leaderboard').innerHTML = html;
  }

  // ── KPI Detail Modal ──────────────────────
  window.KPIDetail = {
    open(salesId, salesName) {
      const kpiList = [];  // Would fetch from API in production
      Modal.createAndOpen('kpi-modal', `📊 KPI — ${salesName}`, `
        <div class="grid-2 mb-4">
          ${[
            ['Total Lead', '45', 'blue'],
            ['Total Closing', '12', 'green'],
            ['Revenue', 'Rp 12.000.000', 'orange'],
            ['Conv. Rate', '26.7%', 'purple'],
          ].map(([label, val, color]) => `
            <div style="background:var(--navy-3);border-radius:var(--radius);padding:14px;border:1px solid var(--border)">
              <div class="text-xs text-muted" style="font-weight:700;text-transform:uppercase;margin-bottom:6px">${label}</div>
              <div style="font-size:20px;font-weight:800;color:var(--${color})">${val}</div>
            </div>`).join('')}
        </div>
        <p class="text-sm text-muted" style="text-align:center">Data detail tersedia setelah integrasi Google Sheets</p>
      `);
    }
  };

})();
