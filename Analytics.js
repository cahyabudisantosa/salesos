// ═══════════════════════════════════════════
// SALES OS — Dashboard.gs
// Stats aggregation untuk dashboard utama
// ═══════════════════════════════════════════

const DashboardService = {

  getStats(params = {}) {
    const cacheKey = 'dashboard_stats';
    const cached = SheetUtils.getCached(cacheKey);
    if (cached) return cached;

    const leads     = SheetUtils.getRows(SHEETS.LEADS);
    const followUps = SheetUtils.getRows(SHEETS.FOLLOWUPS);
    const today     = SheetUtils.today();

    // ── Total Lead ──
    const totalLeads = leads.length;

    // ── Closing (status = installed) ──
    const installed = leads.filter(l => l.status === 'installed');
    const totalClosing = installed.length;

    // ── Revenue estimate (per instalasi) ──
    const REVENUE_PER_INSTALL = 99000;
    const revenue = totalClosing * REVENUE_PER_INSTALL;

    // ── Conversion Rate ──
    const conversionRate = totalLeads > 0
      ? parseFloat(((totalClosing / totalLeads) * 100).toFixed(2))
      : 0;

    // ── Overdue Follow Ups ──
    const overdueFollowups = followUps.filter(
      f => f.status === 'pending' && f.next_followup < today
    ).length;

    // ── Hot Leads (score >= 75) ──
    const hotLeads = leads.filter(l => {
      const score = parseInt(l.score) || 0;
      return score >= 75 && l.status !== 'installed' && l.status !== 'lost';
    }).length;

    // ── New leads today ──
    const newLeadsToday = leads.filter(l => {
      const created = l.created_at ? l.created_at.slice(0, 10) : '';
      return created === today;
    }).length;

    // ── Installed this month ──
    const thisMonth = today.slice(0, 7); // YYYY-MM
    const installedThisMonth = installed.filter(l => {
      return (l.updated_at || '').slice(0, 7) === thisMonth;
    }).length;

    const stats = {
      total_leads:           totalLeads,
      total_closing:         totalClosing,
      revenue:               revenue,
      conversion_rate:       conversionRate,
      overdue_followups:     overdueFollowups,
      hot_leads:             hotLeads,
      new_leads_today:       newLeadsToday,
      installed_this_month:  installedThisMonth,
    };

    SheetUtils.setCached(cacheKey, stats, 60);
    return stats;
  },
};


// ═══════════════════════════════════════════
// SALES OS — Analytics.gs
// KPI per sales, pipeline count, trend
// ═══════════════════════════════════════════

const AnalyticsService = {

  // ── Pipeline Count per Stage ─────────────
  getPipelineCount() {
    const cacheKey = 'pipeline_count';
    const cached = SheetUtils.getCached(cacheKey);
    if (cached) return cached;

    const leads = SheetUtils.getRows(SHEETS.LEADS);
    const count = {};
    const stages = ['cold', 'contacted', 'survey', 'negotiation', 'closing', 'installed', 'lost'];
    stages.forEach(s => count[s] = 0);
    leads.forEach(l => {
      if (count.hasOwnProperty(l.status)) count[l.status]++;
    });

    SheetUtils.setCached(cacheKey, count, 60);
    return count;
  },

  // ── KPI per Sales ─────────────────────────
  getKPI(params = {}) {
    const leads  = SheetUtils.getRows(SHEETS.LEADS);
    const users  = SheetUtils.getRows(SHEETS.USERS);
    const salesUsers = users.filter(u => u.role === 'sales' || u.role === 'owner');

    const REVENUE_PER_INSTALL = 99000;

    const kpiList = salesUsers.map(salesUser => {
      const myLeads    = leads.filter(l => l.sales_id === salesUser.id);
      const myInstalled= myLeads.filter(l => l.status === 'installed');
      const totalLead  = myLeads.length;
      const totalClose = myInstalled.length;
      const revenue    = totalClose * REVENUE_PER_INSTALL;
      const convRate   = totalLead > 0
        ? parseFloat(((totalClose / totalLead) * 100).toFixed(2))
        : 0;

      return {
        sales_id:        salesUser.id,
        sales_name:      salesUser.nama,
        area:            salesUser.area || '',
        total_lead:      totalLead,
        total_closing:   totalClose,
        revenue:         revenue,
        conversion_rate: convRate,
      };
    });

    // Filter by sales_id jika ada
    if (params.sales_id) {
      return kpiList.filter(k => k.sales_id === params.sales_id);
    }

    // Sort by closing DESC
    return kpiList.sort((a, b) => b.total_closing - a.total_closing);
  },

  // ── Monthly Trend (6 bulan terakhir) ──────
  getMonthlyTrend() {
    const cacheKey = 'monthly_trend';
    const cached = SheetUtils.getCached(cacheKey);
    if (cached) return cached;

    const leads = SheetUtils.getRows(SHEETS.LEADS);

    // Buat array 6 bulan terakhir
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key   = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM');
      const label = Utilities.formatDate(d, Session.getScriptTimeZone(), 'MMM');
      months.push({ key, label, leads: 0, closing: 0 });
    }

    leads.forEach(lead => {
      const created = (lead.created_at || '').slice(0, 7);
      const monthEntry = months.find(m => m.key === created);
      if (monthEntry) {
        monthEntry.leads++;
        if (lead.status === 'installed') {
          const updated = (lead.updated_at || '').slice(0, 7);
          const closeEntry = months.find(m => m.key === updated);
          if (closeEntry) closeEntry.closing++;
        }
      }
    });

    const trend = months.map(m => ({
      month:   m.label,
      leads:   m.leads,
      closing: m.closing,
    }));

    SheetUtils.setCached(cacheKey, trend, 300); // cache 5 menit
    return trend;
  },
};
