/* ═══════════════════════════════════════════
   SALES OS — Auth Module
   Firebase Authentication + Session
═══════════════════════════════════════════ */

const Auth = (() => {
  let _user = null;
  let _firebaseApp = null;
  let _firebaseAuth = null;

  // ── Init Firebase ─────────────────────────

  async function init() {
    // Cek apakah Firebase config sudah diset
    if (CONFIG.FIREBASE.apiKey === 'YOUR_FIREBASE_API_KEY') {
      console.warn('[Auth] Firebase belum dikonfigurasi. Mode demo aktif.');
      _loadDemoSession();
      return;
    }

    try {
      // Load Firebase SDK secara dynamic
      await _loadFirebaseSDK();
      _firebaseApp = firebase.initializeApp(CONFIG.FIREBASE);
      _firebaseAuth = firebase.auth();

      _firebaseAuth.onAuthStateChanged(async (fbUser) => {
        if (fbUser) {
          const token = await fbUser.getIdToken();
          const profile = Utils.retrieve(CONFIG.SESSION_KEY);
          _user = {
            uid: fbUser.uid,
            email: fbUser.email,
            token,
            nama: profile?.nama || fbUser.displayName || fbUser.email.split('@')[0],
            role: profile?.role || 'sales',
            area: profile?.area || '',
            id: profile?.id || fbUser.uid,
          };
          Utils.store(CONFIG.SESSION_KEY, _user);
        } else {
          _user = null;
          Utils.remove(CONFIG.SESSION_KEY);
        }
      });
    } catch (err) {
      console.error('[Auth] Firebase init error:', err);
      _loadDemoSession();
    }
  }

  async function _loadFirebaseSDK() {
    if (typeof firebase !== 'undefined') return;
    // Firebase SDK sudah di-include di HTML
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // ── Demo Session (tanpa Firebase) ─────────

  function _loadDemoSession() {
    const stored = Utils.retrieve(CONFIG.SESSION_KEY);
    if (stored) {
      _user = stored;
    }
  }

  // ── Login ─────────────────────────────────

  async function login(email, password) {
    // Demo mode login
    if (CONFIG.FIREBASE.apiKey === 'YOUR_FIREBASE_API_KEY') {
      return _demoLogin(email, password);
    }

    try {
      const cred = await _firebaseAuth.signInWithEmailAndPassword(email, password);
      const token = await cred.user.getIdToken();

      // Ambil profil user dari Google Sheets via API
      const profileRes = await fetch(
        `${CONFIG.API_URL}?action=getUserByEmail&email=${encodeURIComponent(email)}&token=${token}`
      );
      const profileData = await profileRes.json();
      const profile = profileData.data || {};

      _user = {
        uid: cred.user.uid,
        id: profile.id || cred.user.uid,
        email: cred.user.email,
        token,
        nama: profile.nama || email.split('@')[0],
        role: profile.role || 'sales',
        area: profile.area || '',
        no_wa: profile.no_wa || '',
      };
      Utils.store(CONFIG.SESSION_KEY, _user);
      return { success: true, user: _user };
    } catch (err) {
      const msg = _parseFirebaseError(err.code);
      return { success: false, message: msg };
    }
  }

  function _demoLogin(email, password) {
    // Akun demo untuk development
    const DEMO_ACCOUNTS = [
      { email: 'owner@demo.com', password: 'demo123', nama: 'Budi Owner', role: 'owner', area: 'All' },
      { email: 'sales@demo.com', password: 'demo123', nama: 'Eko Sales', role: 'sales', area: 'Kelapa Gading' },
      { email: 'admin@demo.com', password: 'demo123', nama: 'Admin ISP', role: 'admin', area: 'All' },
    ];

    const account = DEMO_ACCOUNTS.find(a => a.email === email && a.password === password);
    if (!account) return { success: false, message: 'Email atau password salah' };

    _user = {
      id: 'demo_' + account.role,
      uid: 'demo_' + account.role,
      email: account.email,
      token: 'demo_token_' + Date.now(),
      nama: account.nama,
      role: account.role,
      area: account.area,
    };
    Utils.store(CONFIG.SESSION_KEY, _user);
    return { success: true, user: _user };
  }

  // ── Logout ────────────────────────────────

  async function logout() {
    try {
      if (_firebaseAuth) await _firebaseAuth.signOut();
    } catch (e) { /* ignore */ }
    _user = null;
    Utils.remove(CONFIG.SESSION_KEY);
    Utils.remove(CONFIG.TOKEN_KEY);
    window.location.href = '/index.html';
  }

  // ── Session Helpers ───────────────────────

  function getUser() {
    if (_user) return _user;
    return Utils.retrieve(CONFIG.SESSION_KEY);
  }

  function isLoggedIn() {
    return !!getUser();
  }

  function isOwner() {
    const u = getUser();
    return u?.role === 'owner' || u?.role === 'admin';
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = '/index.html';
      return false;
    }
    return true;
  }

  function refreshToken() {
    if (_firebaseAuth?.currentUser) {
      return _firebaseAuth.currentUser.getIdToken(true).then(token => {
        _user = { ..._user, token };
        Utils.store(CONFIG.SESSION_KEY, _user);
        return token;
      });
    }
    return Promise.resolve(null);
  }

  // ── Error Parser ──────────────────────────

  function _parseFirebaseError(code) {
    const errors = {
      'auth/user-not-found': 'Email tidak terdaftar',
      'auth/wrong-password': 'Password salah',
      'auth/invalid-email': 'Format email tidak valid',
      'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi nanti',
      'auth/network-request-failed': 'Koneksi bermasalah. Periksa internet Anda',
      'auth/invalid-credential': 'Email atau password salah',
    };
    return errors[code] || 'Login gagal. Silakan coba lagi';
  }

  return { init, login, logout, getUser, isLoggedIn, isOwner, requireAuth, refreshToken };
})();
