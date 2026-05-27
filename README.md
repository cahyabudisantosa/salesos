# 🚀 Sales OS — ISP Sales Management System

> Sistem manajemen sales ISP berbasis web. Mobile-first, ringan, cepat.  
> Stack: HTML + Tailwind CSS + Vanilla JS + Google Apps Script + Google Sheets

---

## 📋 Fitur Utama

| Fitur | Keterangan |
|-------|-----------|
| 🔐 Login System | Firebase Auth + Demo mode |
| 📊 Dashboard KPI | Total lead, closing, revenue, overdue FU |
| 👤 Lead Management | CRUD lead, search, filter, assign sales |
| 📡 Pipeline Kanban | Drag & drop visual pipeline |
| 📅 Follow Up Engine | Reminder, overdue alert, reschedule |
| 📝 Activity Timeline | Histori komunikasi per customer |
| 📈 Analytics | Leaderboard, trend bulanan, funnel |
| 💬 WA Quick Action | Click to WhatsApp + template pesan |

---

## 🗂 Struktur Folder

```
sales-os/
├── index.html          ← Login page
├── dashboard.html      ← Dashboard KPI
├── leads.html          ← Manajemen lead
├── pipeline.html       ← Kanban pipeline
├── followup.html       ← Follow up engine
├── analytics.html      ← Analytics & KPI (owner)
│
├── css/
│   └── style.css       ← Design system lengkap
│
├── js/
│   ├── config.js       ← Konfigurasi app & API URL
│   ├── utils.js        ← Helper functions
│   ├── api.js          ← API layer (fetch + mock fallback)
│   ├── auth.js         ← Firebase Auth + session
│   ├── dashboard.js    ← Dashboard logic
│   ├── leads.js        ← Lead CRUD + modals
│   ├── pipeline.js     ← Kanban drag & drop
│   ├── followup.js     ← Follow up engine
│   └── analytics.js    ← Charts & KPI
│
├── components/
│   └── components.js   ← Sidebar, modal, cards, nav
│
└── apps-script/        ← Google Apps Script backend
    ├── Code.gs         ← Main router (doGet/doPost)
    ├── Utils.gs        ← Sheet helpers + cache
    ├── Lead.gs         ← Lead CRUD service
    ├── Services.gs     ← FollowUp, Activity, User
    ├── Analytics.gs    ← Dashboard & KPI stats
    └── Setup.gs        ← Inisialisasi sheet + trigger
```

---

## ⚡ Quick Start (Demo Mode)

**Tanpa setup backend** — langsung bisa jalan dengan mock data:

```bash
# Clone / download project
git clone https://github.com/yourusername/sales-os.git
cd sales-os

# Buka di browser
open index.html
# atau
npx serve .
```

Login dengan akun demo:
- `owner@demo.com` / `demo123` → akses full (owner)
- `sales@demo.com` / `demo123` → akses sales

---

## 🔧 Setup Production

### Step 1 — Google Sheets

1. Buat Google Spreadsheet baru
2. Catat **Spreadsheet ID** dari URL:  
   `https://docs.google.com/spreadsheets/d/`**`SPREADSHEET_ID`**`/edit`

### Step 2 — Google Apps Script

1. Buka [script.google.com](https://script.google.com)
2. Buat project baru
3. Copy semua file dari folder `apps-script/` ke editor:
   - `Code.gs`, `Utils.gs`, `Lead.gs`, `Services.gs`, `Analytics.gs`, `Setup.gs`
4. Edit `Code.gs`, ganti `SHEET_ID`:
   ```javascript
   const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID'; // ← paste ID Anda
   ```
5. **Jalankan `setupSheets()`** (run sekali untuk buat struktur sheet)
6. **Deploy sebagai Web App:**
   - Klik `Deploy` → `New Deployment`
   - Type: `Web App`
   - Execute as: `Me`
   - Who has access: `Anyone`
   - Klik `Deploy` → Copy **Web App URL**

### Step 3 — Firebase Auth (opsional)

1. Buka [console.firebase.google.com](https://console.firebase.google.com)
2. Buat project baru
3. Enable `Authentication` → `Email/Password`
4. Project Settings → Your apps → Config → Copy config object
5. Edit `js/config.js`, isi bagian `FIREBASE`:
   ```javascript
   FIREBASE: {
     apiKey: 'AIza...',
     authDomain: 'your-project.firebaseapp.com',
     projectId: 'your-project-id',
     // ...
   }
   ```
6. Tambahkan Firebase SDK ke `index.html` sebelum `</body>`:
   ```html
   <script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-auth-compat.js"></script>
   ```

### Step 4 — Update API URL

Edit `js/config.js`:
```javascript
API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
```

### Step 5 — Deploy ke GitHub Pages

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/yourusername/sales-os.git
git push -u origin main
```

Aktifkan GitHub Pages:  
`Settings` → `Pages` → Source: `main` → `/root`

---

## 📊 Google Sheet Structure

### Sheet: USERS
| id | nama | email | role | area | no_wa | created_at |
|----|------|-------|------|------|-------|-----------|

### Sheet: LEADS
| id | nama | no_wa | area | address | source | status | score | sales_id | note | created_at | updated_at |
|----|------|-------|------|---------|--------|--------|-------|----------|------|-----------|-----------|

### Sheet: ACTIVITIES
| id | lead_id | activity_type | note | created_by | created_at |
|----|---------|--------------|------|-----------|-----------|

### Sheet: FOLLOWUPS
| id | lead_id | lead_name | next_followup | note | status | created_at |
|----|---------|----------|--------------|------|--------|-----------|

---

## 🔄 Pipeline Status

```
cold → contacted → survey → negotiation → closing → installed
                                                   ↘ lost
```

| Status | Icon | Keterangan |
|--------|------|-----------|
| cold | ❄️ | Lead baru masuk, belum dikontak |
| contacted | 📞 | Sudah dihubungi |
| survey | 🔍 | Dalam proses survey |
| negotiation | 🤝 | Sedang negosiasi |
| closing | ✅ | Deal! Menunggu instalasi |
| installed | 📡 | Sudah terpasang |
| lost | ❌ | Tidak jadi pasang |

---

## 🔌 API Endpoints

```
GET  ?action=getLeads            → Semua lead
GET  ?action=getLead&id=...      → Lead by ID
GET  ?action=searchLeads&q=...   → Search lead
GET  ?action=getHotLeads         → Hot leads (score ≥75)
GET  ?action=getFollowUps        → Semua follow up
GET  ?action=getDashboardStats   → Stats dashboard
GET  ?action=getPipelineCount    → Jumlah per stage
GET  ?action=getMonthlyTrend     → Trend 6 bulan
GET  ?action=getKPI              → KPI per sales
GET  ?action=getActivities&lead_id=... → Histori lead

POST ?action=createLead          → Tambah lead
POST ?action=updateLead          → Update lead
POST ?action=deleteLead          → Hapus lead
POST ?action=createActivity      → Catat aktivitas
POST ?action=createFollowUp      → Buat follow up
POST ?action=updateFollowUp      → Update FU status
```

**Response format:**
```json
{
  "success": true,
  "data": []
}
```

---

## 📱 Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| owner@demo.com | demo123 | Owner (akses full) |
| sales@demo.com | demo123 | Sales |
| admin@demo.com | demo123 | Admin |

---

## 🛠 Tech Stack

- **Frontend:** HTML5, CSS3 (custom design system), Vanilla JavaScript ES6+
- **Backend:** Google Apps Script
- **Database:** Google Sheets
- **Auth:** Firebase Authentication
- **Hosting:** GitHub Pages
- **Font:** Plus Jakarta Sans (Google Fonts)

---

## 📧 Email Reminder (Opsional)

Jalankan `setupTriggers()` di Apps Script untuk aktifkan email reminder harian jam 8 pagi ke setiap sales berisi daftar follow up hari ini + overdue.

---

## 🗺 Roadmap

- [ ] Push notification (Web Push API)
- [ ] Export PDF report
- [ ] Multi-tenant (multi ISP)
- [ ] Import lead dari CSV/Excel
- [ ] Integrasi Google Maps (coverage check)
- [ ] Customer portal

---

## 📄 License

MIT License — bebas digunakan dan dimodifikasi.

---

Made with ❤️ untuk tim sales ISP Indonesia 🇮🇩
