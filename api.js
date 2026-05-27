/* ═══════════════════════════════════════════
   SALES OS — API Layer
   Komunikasi dengan Google Apps Script
═══════════════════════════════════════════ */

const API = (() => {
  let _loading = false;

  // ── Core Fetch ────────────────────────────

  async function request(action, method = 'GET', body = null) {
    _loading = true;
    const url = new URL(CONFIG.API_URL);
    url.searchParams.set('action', action);

    // Tambahkan token auth dari session
    const user = Auth.getUser();
    if (user?.token) url.searchParams.set('token', user.token);

    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
    };

    if (method !== 'GET' && body) {
      opts.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(url.toString(), opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'API Error');
      return data;
    } catch (err) {
      console.error(`[API] ${action} failed:`, err);
      // Fallback ke mock data jika API belum dikonfigurasi
      if (CONFIG.API_URL.includes('YOUR_SCRIPT_ID')) {
        return _mockFallback(action, body);
      }
      throw err;
    } finally {
      _loading = false;
    }
  }

  function get(action, params = {}) {
    const url = new URL(CONFIG.API_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const user = Auth.getUser();
    if (user?.token) url.searchParams.set('token', user.token);
    return fetch(url.toString(), { mode: 'cors' })
      .then(r => r.json())
      .catch(() => _mockFallback(action, params));
  }

  // ── LEADS ─────────────────────────────────

  const Leads = {
    async getAll(filters = {}) {
      const res = await get('getLeads', filters);
      return res.data || [];
    },

    async getById(id) {
      const res = await get('getLead', { id });
      return res.data || null;
    },

    async create(payload) {
      const res = await request('createLead', 'POST', {
        ...payload,
        id: Utils.generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return res.data;
    },

    async update(id, payload) {
      const res = await request('updateLead', 'POST', {
        ...payload,
        id,
        updated_at: new Date().toISOString(),
      });
      return res.data;
    },

    async updateStatus(id, status) {
      return Leads.update(id, { status });
    },

    async delete(id) {
      const res = await request('deleteLead', 'POST', { id });
      return res.success;
    },

    async search(query) {
      const res = await get('searchLeads', { q: query });
      return res.data || [];
    },
  };

  // ── ACTIVITIES ────────────────────────────

  const Activities = {
    async getByLead(leadId) {
      const res = await get('getActivities', { lead_id: leadId });
      return res.data || [];
    },

    async create(payload) {
      const res = await request('createActivity', 'POST', {
        ...payload,
        id: Utils.generateId(),
        created_at: new Date().toISOString(),
      });
      return res.data;
    },
  };

  // ── FOLLOW UPS ────────────────────────────

  const FollowUps = {
    async getAll(filters = {}) {
      const res = await get('getFollowUps', filters);
      return res.data || [];
    },

    async getOverdue() {
      const res = await get('getFollowUps', { status: 'overdue' });
      return res.data || [];
    },

    async create(payload) {
      const res = await request('createFollowUp', 'POST', {
        ...payload,
        id: Utils.generateId(),
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      return res.data;
    },

    async complete(id) {
      const res = await request('updateFollowUp', 'POST', {
        id, status: 'done', updated_at: new Date().toISOString()
      });
      return res.data;
    },

    async update(id, payload) {
      const res = await request('updateFollowUp', 'POST', { ...payload, id });
      return res.data;
    },
  };

  // ── DASHBOARD ─────────────────────────────

  const Dashboard = {
    async getStats() {
      const res = await get('getDashboardStats');
      return res.data || _mockStats();
    },

    async getHotLeads() {
      const res = await get('getHotLeads');
      return res.data || [];
    },
  };

  // ── ANALYTICS ─────────────────────────────

  const Analytics = {
    async getKPI(salesId = null) {
      const params = salesId ? { sales_id: salesId } : {};
      const res = await get('getKPI', params);
      return res.data || [];
    },

    async getPipelineCount() {
      const res = await get('getPipelineCount');
      return res.data || {};
    },

    async getMonthlyTrend() {
      const res = await get('getMonthlyTrend');
      return res.data || [];
    },
  };

  // ── USERS ─────────────────────────────────

  const Users = {
    async getAll() {
      const res = await get('getUsers');
      return res.data || [];
    },

    async getSales() {
      const res = await get('getUsers', { role: 'sales' });
      return res.data || [];
    },
  };

  // ── Mock Fallback (Demo Mode) ─────────────

  function _mockFallback(action, params) {
    console.warn('[API] Using mock data for:', action);
    const mocks = {
      getLeads:         { success: true, data: _mockLeads() },
      getLead:          { success: true, data: _mockLeads()[0] },
      getFollowUps:     { success: true, data: _mockFollowUps() },
      getDashboardStats:{ success: true, data: _mockStats() },
      getHotLeads:      { success: true, data: _mockLeads().slice(0, 3) },
      getPipelineCount: { success: true, data: _mockPipelineCount() },
      getMonthlyTrend:  { success: true, data: _mockTrend() },
      getKPI:           { success: true, data: _mockKPI() },
      getActivities:    { success: true, data: _mockActivities() },
      getUsers:         { success: true, data: _mockUsers() },
      createLead:       { success: true, data: { id: Utils.generateId() } },
      updateLead:       { success: true, data: {} },
      deleteLead:       { success: true },
      createActivity:   { success: true, data: {} },
      createFollowUp:   { success: true, data: {} },
      updateFollowUp:   { success: true, data: {} },
    };
    return mocks[action] || { success: true, data: [] };
  }

  function _mockStats() {
    return {
      total_leads: 128,
      total_closing: 34,
      revenue: 34000000,
      conversion_rate: 26.6,
      overdue_followups: 7,
      hot_leads: 12,
      new_leads_today: 5,
      installed_this_month: 18,
    };
  }

  function _mockLeads() {
    const areas = ['Kelapa Gading', 'Sunter', 'Kemayoran', 'Cempaka Putih', 'Tanjung Priok'];
    const sources = ['WhatsApp', 'Referral', 'Facebook', 'Walk-in', 'Instagram'];
    const statuses = ['cold', 'contacted', 'survey', 'negotiation', 'closing', 'installed'];
    const names = ['Budi Santoso', 'Siti Rahayu', 'Ahmad Fauzi', 'Dewi Lestari', 'Rizky Pratama',
                   'Nia Kurniawati', 'Hendra Wijaya', 'Fitri Andayani', 'Dimas Prayogo', 'Lina Susanti',
                   'Agus Mulyono', 'Rini Handayani', 'Fajar Nugroho', 'Yuni Astuti', 'Bayu Setiawan'];
    return names.map((name, i) => ({
      id: 'lead_' + (i + 1),
      nama: name,
      no_wa: '08' + String(Math.floor(Math.random() * 9000000000 + 1000000000)),
      area: areas[i % areas.length],
      address: `Jl. ${areas[i % areas.length]} No. ${i + 1}`,
      source: sources[i % sources.length],
      status: statuses[i % statuses.length],
      score: Math.floor(Math.random() * 100),
      sales_id: 'user_1',
      sales_name: 'Eko Sales',
      created_at: new Date(Date.now() - i * 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - i * 43200000).toISOString(),
      note: i % 3 === 0 ? 'Customer tertarik paket 20Mbps' : '',
    }));
  }

  function _mockFollowUps() {
    const leads = _mockLeads();
    return leads.slice(0, 8).map((lead, i) => ({
      id: 'fu_' + i,
      lead_id: lead.id,
      lead_name: lead.nama,
      lead_wa: lead.no_wa,
      lead_area: lead.area,
      lead_status: lead.status,
      next_followup: new Date(Date.now() + (i - 2) * 86400000).toISOString().split('T')[0],
      note: i % 2 === 0 ? 'Tindak lanjut survey' : 'Konfirmasi harga paket',
      status: 'pending',
      created_at: new Date().toISOString(),
    }));
  }

  function _mockPipelineCount() {
    return { cold: 18, contacted: 24, survey: 15, negotiation: 9, closing: 7, installed: 34, lost: 21 };
  }

  function _mockTrend() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];
    return months.map(m => ({
      month: m,
      leads: Math.floor(Math.random() * 30 + 10),
      closing: Math.floor(Math.random() * 10 + 3),
    }));
  }

  function _mockKPI() {
    return [{
      sales_id: 'user_1', sales_name: 'Eko Prasetyo',
      total_lead: 45, total_closing: 12, revenue: 12000000, conversion_rate: 26.7
    }, {
      sales_id: 'user_2', sales_name: 'Rina Sari',
      total_lead: 38, total_closing: 9, revenue: 9000000, conversion_rate: 23.7
    }, {
      sales_id: 'user_3', sales_name: 'Dedi Kurniawan',
      total_lead: 52, total_closing: 14, revenue: 14000000, conversion_rate: 26.9
    }];
  }

  function _mockActivities() {
    const types = ['call', 'chat', 'survey', 'nego', 'note'];
    const notes = [
      'Sudah dihubungi, tertarik paket 20Mbps',
      'Survey sudah dilakukan, area coverage bagus',
      'Negosiasi harga, minta diskon instalasi',
      'Customer konfirmasi jadi pasang',
      'Masalah jaringan di area ini, perlu pengecekan',
    ];
    return types.map((type, i) => ({
      id: 'act_' + i,
      lead_id: 'lead_1',
      activity_type: type,
      note: notes[i],
      created_by: 'Eko Sales',
      created_at: new Date(Date.now() - i * 3600000 * 6).toISOString(),
    }));
  }

  function _mockUsers() {
    return [
      { id: 'user_1', nama: 'Eko Prasetyo', role: 'sales', area: 'Kelapa Gading', no_wa: '081234567890' },
      { id: 'user_2', nama: 'Rina Sari', role: 'sales', area: 'Sunter', no_wa: '081234567891' },
      { id: 'user_3', nama: 'Dedi Kurniawan', role: 'sales', area: 'Kemayoran', no_wa: '081234567892' },
    ];
  }

  function _mockStats() {
    return {
      total_leads: 128, total_closing: 34,
      revenue: 34000000, conversion_rate: 26.6,
      overdue_followups: 7, hot_leads: 12,
      new_leads_today: 5, installed_this_month: 18,
    };
  }

  return { Leads, Activities, FollowUps, Dashboard, Analytics, Users, isLoading: () => _loading };
})();
