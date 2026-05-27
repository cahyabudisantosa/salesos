// ═══════════════════════════════════════════
// SALES OS — Google Apps Script Backend
// File: Code.gs  (Main Router)
// ═══════════════════════════════════════════

// ── Spreadsheet Config ────────────────────
const SHEET_ID = '1V_ZetFvcUyVzEVxZowA9YFMn8Hkeq9KnfwaP9fsUbxY'; // ← Ganti dengan Sheet ID Anda
const SS = SpreadsheetApp.openById(SHEET_ID);

const SHEETS = {
  USERS:     'USERS',
  LEADS:     'LEADS',
  ACTIVITIES:'ACTIVITIES',
  FOLLOWUPS: 'FOLLOWUPS',
  KPI:       'KPI',
};

// ── CORS Headers ──────────────────────────
function _cors(output) {
  return output
    .setMimeType(ContentService.MimeType.JSON)
    .addHeader('Access-Control-Allow-Origin', '*')
    .addHeader('Access-Control-Allow-Methods', 'GET, POST')
    .addHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function _ok(data) {
  return _cors(
    ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
  );
}

function _err(message) {
  return _cors(
    ContentService.createTextOutput(JSON.stringify({ success: false, message: message }))
  );
}

// ── GET Router ────────────────────────────
function doGet(e) {
  try {
    const action = e.parameter.action;
    const params = e.parameter;

    switch (action) {
      // Leads
      case 'getLeads':        return _ok(LeadService.getAll(params));
      case 'getLead':         return _ok(LeadService.getById(params.id));
      case 'searchLeads':     return _ok(LeadService.search(params.q));
      case 'getHotLeads':     return _ok(LeadService.getHot());

      // Follow Ups
      case 'getFollowUps':    return _ok(FollowUpService.getAll(params));

      // Dashboard
      case 'getDashboardStats': return _ok(DashboardService.getStats(params));

      // Analytics
      case 'getKPI':          return _ok(AnalyticsService.getKPI(params));
      case 'getPipelineCount':return _ok(AnalyticsService.getPipelineCount());
      case 'getMonthlyTrend': return _ok(AnalyticsService.getMonthlyTrend());

      // Users
      case 'getUsers':        return _ok(UserService.getAll(params));
      case 'getUserByEmail':  return _ok(UserService.getByEmail(params.email));

      // Activities
      case 'getActivities':   return _ok(ActivityService.getByLead(params.lead_id));

      default:
        return _err('Action tidak dikenali: ' + action);
    }
  } catch (err) {
    Logger.log('doGet Error: ' + err.toString());
    return _err(err.message || 'Server error');
  }
}

// ── POST Router ───────────────────────────
function doPost(e) {
  try {
    const action = e.parameter.action;
    const body = JSON.parse(e.postData.contents || '{}');

    switch (action) {
      // Leads
      case 'createLead':      return _ok(LeadService.create(body));
      case 'updateLead':      return _ok(LeadService.update(body));
      case 'deleteLead':      return _ok(LeadService.remove(body.id));

      // Activities
      case 'createActivity':  return _ok(ActivityService.create(body));

      // Follow Ups
      case 'createFollowUp':  return _ok(FollowUpService.create(body));
      case 'updateFollowUp':  return _ok(FollowUpService.update(body));

      // Users
      case 'createUser':      return _ok(UserService.create(body));

      default:
        return _err('Action tidak dikenali: ' + action);
    }
  } catch (err) {
    Logger.log('doPost Error: ' + err.toString());
    return _err(err.message || 'Server error');
  }
}

// ── OPTIONS preflight (CORS) ──────────────
function doOptions(e) {
  return _cors(ContentService.createTextOutput(''));
}
