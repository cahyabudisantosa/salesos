/* ═══════════════════════════════════════════
   SALES OS — Config
   Ganti nilai di bawah sesuai setup Anda
═══════════════════════════════════════════ */

const CONFIG = {
  // ── Google Apps Script Web App URL ──
  // Setelah deploy Apps Script, paste URL-nya di sini
  API_URL: 'https://script.google.com/macros/s/AKfycbxtm5-NYdJBL2PJHTBD-1QTJzHqbX5zYAh8HqX-s5rU8of8xCRKPqql3H7_eRp3ClTy7w/exec',

  // ── Firebase Config ──
  // Dari Firebase Console → Project Settings → Your Apps
  FIREBASE: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT.appspot.com',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
  },

  // ── App Settings ──
  APP_NAME: 'Sales OS',
  APP_VERSION: '1.0.0',
  COMPANY: 'ISP Sales System',

  // ── Session ──
  SESSION_KEY: 'sales_os_user',
  TOKEN_KEY: 'sales_os_token',

  // ── Pipeline Status (urutan pipeline) ──
  PIPELINE_STAGES: [
    { id: 'cold',        label: 'Cold',        color: '#64748B', icon: '❄️' },
    { id: 'contacted',   label: 'Contacted',   color: '#3B82F6', icon: '📞' },
    { id: 'survey',      label: 'Survey',      color: '#8B5CF6', icon: '🔍' },
    { id: 'negotiation', label: 'Nego',        color: '#F59E0B', icon: '🤝' },
    { id: 'closing',     label: 'Closing',     color: '#F97316', icon: '✅' },
    { id: 'installed',   label: 'Installed',   color: '#10B981', icon: '📡' },
    { id: 'lost',        label: 'Lost',        color: '#EF4444', icon: '❌' },
  ],

  // ── Lead Source ──
  LEAD_SOURCES: [
    'Walk-in', 'WhatsApp', 'Referral', 'Facebook', 'Instagram',
    'Google', 'Banner', 'Sales Lapangan', 'Lainnya'
  ],

  // ── WA Templates ──
  WA_TEMPLATES: {
    followup: (name) => `Halo kak *${name}*, saya dari tim Sales ISP. Ada yang bisa saya bantu terkait layanan internet Anda? 🙏`,
    survey:   (name) => `Halo kak *${name}*, kami konfirmasi jadwal survey untuk pemasangan internet. Apakah besok bisa? Terima kasih 😊`,
    closing:  (name) => `Selamat kak *${name}*! Pemasangan internet sudah selesai. Jika ada kendala, silakan hubungi kami. Terima kasih sudah memilih layanan kami 🎉`,
    reminder: (name) => `Halo kak *${name}*, reminder tagihan internet bulan ini. Mohon segera dilunasi ya. Terima kasih 🙏`,
  },

  // ── Date Format ──
  DATE_FORMAT: { day: 'numeric', month: 'short', year: 'numeric' },
  TIME_FORMAT: { hour: '2-digit', minute: '2-digit' },

  // ── Pagination ──
  PAGE_SIZE: 20,

  // ── Lead Score Thresholds ──
  SCORE: { HOT: 75, WARM: 40 },
};

// Freeze agar tidak bisa di-modify runtime
Object.freeze(CONFIG);
Object.freeze(CONFIG.FIREBASE);
