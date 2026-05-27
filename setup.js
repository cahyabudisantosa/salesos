// ═══════════════════════════════════════════
// SALES OS — Setup.gs
// Jalankan setupSheets() SEKALI untuk
// membuat struktur Google Sheet otomatis
// ═══════════════════════════════════════════

function setupSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  Logger.log('Setup dimulai untuk: ' + ss.getName());

  _createSheet(ss, SHEETS.USERS, [
    'id', 'nama', 'email', 'role', 'area', 'no_wa', 'created_at'
  ]);

  _createSheet(ss, SHEETS.LEADS, [
    'id', 'nama', 'no_wa', 'area', 'address', 'source',
    'status', 'score', 'sales_id', 'note', 'created_at', 'updated_at'
  ]);

  _createSheet(ss, SHEETS.ACTIVITIES, [
    'id', 'lead_id', 'activity_type', 'note', 'created_by', 'created_at'
  ]);

  _createSheet(ss, SHEETS.FOLLOWUPS, [
    'id', 'lead_id', 'lead_name', 'next_followup', 'note', 'status', 'created_at'
  ]);

  _createSheet(ss, SHEETS.KPI, [
    'sales_id', 'total_lead', 'total_closing', 'revenue', 'conversion_rate', 'updated_at'
  ]);

  // Seed demo user
  _seedDemoData(ss);

  Logger.log('✅ Setup selesai! Semua sheet berhasil dibuat.');
  SpreadsheetApp.getUi().alert('✅ Setup berhasil!\n\nSemua sheet sudah dibuat.\nSiap digunakan.');
}

function _createSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    Logger.log('Sheet dibuat: ' + name);
  } else {
    Logger.log('Sheet sudah ada: ' + name + ' (skip)');
    return sheet;
  }

  // Header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1A2744');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontFamily('Inter');

  // Freeze header
  sheet.setFrozenRows(1);

  // Auto-resize
  headers.forEach((_, i) => sheet.autoResizeColumn(i + 1));

  // Alternating row colors
  sheet.getRange(2, 1, 999, headers.length)
    .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);

  return sheet;
}

function _seedDemoData(ss) {
  const userSheet = ss.getSheetByName(SHEETS.USERS);
  const existing = userSheet.getLastRow();

  if (existing > 1) {
    Logger.log('Data user sudah ada, skip seed.');
    return;
  }

  // Demo owner
  userSheet.appendRow([
    'usr_owner_1', 'Budi Santoso (Owner)', 'owner@demo.com',
    'owner', 'All', '081234567890', new Date().toISOString()
  ]);

  // Demo sales
  const salesTeam = [
    ['usr_sales_1', 'Eko Prasetyo', 'sales@demo.com',    'sales', 'Kelapa Gading', '081234567891'],
    ['usr_sales_2', 'Rina Sari',    'rina@demo.com',     'sales', 'Sunter',         '081234567892'],
    ['usr_sales_3', 'Dedi Kurnia',  'dedi@demo.com',     'sales', 'Kemayoran',      '081234567893'],
  ];
  salesTeam.forEach(s => userSheet.appendRow([...s, new Date().toISOString()]));

  Logger.log('✅ Demo users berhasil di-seed');
}


// ═══════════════════════════════════════════
// TRIGGER SETUP
// Jalankan setupTriggers() untuk auto-reminder
// ═══════════════════════════════════════════

function setupTriggers() {
  // Hapus semua trigger lama
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // Daily reminder jam 8 pagi
  ScriptApp.newTrigger('sendDailyReminder')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  Logger.log('✅ Trigger daily reminder jam 8 berhasil dibuat');
}

// ── Daily Reminder (via trigger) ─────────
function sendDailyReminder() {
  const today     = SheetUtils.today();
  const followUps = SheetUtils.getRows(SHEETS.FOLLOWUPS);
  const leads     = SheetUtils.getRows(SHEETS.LEADS);
  const users     = SheetUtils.getRows(SHEETS.USERS);

  // FU hari ini yang pending
  const todayFUs = followUps.filter(f =>
    f.status === 'pending' && f.next_followup === today
  );

  // Overdue
  const overdueFUs = followUps.filter(f =>
    f.status === 'pending' && f.next_followup < today
  );

  if (todayFUs.length === 0 && overdueFUs.length === 0) {
    Logger.log('Tidak ada follow up hari ini');
    return;
  }

  // Group by sales_id
  const bySales = {};
  [...todayFUs, ...overdueFUs].forEach(fu => {
    const lead = leads.find(l => l.id === fu.lead_id) || {};
    const sid  = lead.sales_id || 'unknown';
    if (!bySales[sid]) bySales[sid] = { today: [], overdue: [] };
    const isToday = fu.next_followup === today;
    bySales[sid][isToday ? 'today' : 'overdue'].push({ fu, lead });
  });

  // Send email ke tiap sales
  Object.entries(bySales).forEach(([salesId, data]) => {
    const salesUser = users.find(u => u.id === salesId);
    if (!salesUser?.email) return;

    const subject = `📅 Sales OS — ${data.today.length} Follow Up Hari Ini, ⚠️ ${data.overdue.length} Overdue`;
    const body = _buildEmailBody(salesUser.nama, data.today, data.overdue);

    GmailApp.sendEmail(salesUser.email, subject, '', { htmlBody: body });
    Logger.log('Email terkirim ke: ' + salesUser.email);
  });
}

function _buildEmailBody(salesName, todayItems, overdueItems) {
  const style = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #1e293b; line-height: 1.6;
  `;
  const rows = (items, label, color) => items.map(({ fu, lead }) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9">
        <strong>${lead.nama || fu.lead_name || '-'}</strong><br>
        <small style="color:#64748b">📍 ${lead.area || '-'} · 📱 ${lead.no_wa || '-'}</small>
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9">
        <span style="background:${color}22;color:${color};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700">${label}</span>
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b">${fu.note || '-'}</td>
    </tr>
  `).join('');

  return `
  <div style="${style}max-width:600px;margin:0 auto">
    <div style="background:#0B1426;padding:24px;border-radius:12px 12px 0 0;text-align:center">
      <div style="font-size:24px;font-weight:800;color:white;letter-spacing:-1px">Sales OS</div>
      <div style="color:#64748b;font-size:13px;margin-top:4px">ISP Sales Management</div>
    </div>

    <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
      <p>Halo <strong>${salesName}</strong>, ini ringkasan follow up Anda untuk hari ini 👋</p>

      ${todayItems.length > 0 ? `
      <h3 style="color:#1e40af;margin:20px 0 12px">📅 Follow Up Hari Ini (${todayItems.length})</h3>
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <thead><tr style="background:#1e40af;color:white">
          <th style="padding:10px 14px;text-align:left;font-size:12px">Customer</th>
          <th style="padding:10px 14px;text-align:left;font-size:12px">Status</th>
          <th style="padding:10px 14px;text-align:left;font-size:12px">Catatan</th>
        </tr></thead>
        <tbody>${rows(todayItems, 'Hari Ini', '#1d4ed8')}</tbody>
      </table>` : ''}

      ${overdueItems.length > 0 ? `
      <h3 style="color:#dc2626;margin:20px 0 12px">⚠️ Overdue — Segera Tindak Lanjuti (${overdueItems.length})</h3>
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <thead><tr style="background:#dc2626;color:white">
          <th style="padding:10px 14px;text-align:left;font-size:12px">Customer</th>
          <th style="padding:10px 14px;text-align:left;font-size:12px">Status</th>
          <th style="padding:10px 14px;text-align:left;font-size:12px">Catatan</th>
        </tr></thead>
        <tbody>${rows(overdueItems, 'Overdue', '#dc2626')}</tbody>
      </table>` : ''}

      <div style="margin-top:24px;padding:16px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe">
        <p style="margin:0;font-size:14px;color:#1e40af">
          💡 <strong>Tip:</strong> Hubungi customer dengan WhatsApp untuk hasil yang lebih cepat.
          Login ke Sales OS untuk update status dan tambah aktivitas.
        </p>
      </div>

      <p style="color:#94a3b8;font-size:12px;margin-top:20px;text-align:center">
        Email otomatis dari Sales OS · Jangan balas email ini
      </p>
    </div>
  </div>`;
}
