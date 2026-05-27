/* ═══════════════════════════════════════════
   SALES OS — Utils
   Shared helper functions
═══════════════════════════════════════════ */

const Utils = (() => {

  // ── Date Helpers ──────────────────────────

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return '-';
    return d.toLocaleDateString('id-ID', CONFIG.DATE_FORMAT);
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return '-';
    return d.toLocaleDateString('id-ID', { ...CONFIG.DATE_FORMAT, ...CONFIG.TIME_FORMAT });
  }

  function formatDateInput(dateStr) {
    // Return YYYY-MM-DD for input[type=date]
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toISOString().split('T')[0];
  }

  function isOverdue(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date(today());
  }

  function isToday(dateStr) {
    if (!dateStr) return false;
    return dateStr.slice(0, 10) === today();
  }

  function today() {
    return new Date().toISOString().split('T')[0];
  }

  function relativeTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
    return formatDate(dateStr);
  }

  function getDayMonth(dateStr) {
    if (!dateStr) return { day: '-', month: '-' };
    const d = new Date(dateStr);
    return {
      day: d.getDate(),
      month: d.toLocaleString('id-ID', { month: 'short' }),
    };
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.floor((d - now) / 86400000);
  }

  // ── String Helpers ────────────────────────

  function initials(name = '') {
    return name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
  }

  function truncate(str, len = 40) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '…' : str;
  }

  function slugify(str) {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  function formatPhone(phone) {
    if (!phone) return '';
    // Normalize Indonesian phone number
    let p = phone.replace(/\D/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    if (!p.startsWith('62')) p = '62' + p;
    return p;
  }

  function formatCurrency(num) {
    if (num == null) return 'Rp 0';
    return 'Rp ' + Number(num).toLocaleString('id-ID');
  }

  // ── ID Generator ──────────────────────────

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ── DOM Helpers ───────────────────────────

  function $(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function $$(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  }

  function el(tag, attrs = {}, ...children) {
    const elem = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') elem.className = v;
      else if (k === 'html') elem.innerHTML = v;
      else if (k.startsWith('on')) elem.addEventListener(k.slice(2), v);
      else elem.setAttribute(k, v);
    });
    children.forEach(c => {
      if (typeof c === 'string') elem.insertAdjacentHTML('beforeend', c);
      else if (c) elem.appendChild(c);
    });
    return elem;
  }

  function setHTML(selector, html, parent = document) {
    const e = parent.querySelector(selector);
    if (e) e.innerHTML = html;
  }

  function setText(selector, text, parent = document) {
    const e = parent.querySelector(selector);
    if (e) e.textContent = text;
  }

  function show(selector, parent = document) {
    const e = typeof selector === 'string' ? parent.querySelector(selector) : selector;
    if (e) e.style.display = '';
  }

  function hide(selector, parent = document) {
    const e = typeof selector === 'string' ? parent.querySelector(selector) : selector;
    if (e) e.style.display = 'none';
  }

  // ── Toast Notifications ───────────────────

  function toast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = {
      success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;color:#10B981"><polyline points="20 6 9 17 4 12"/></svg>`,
      error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;color:#EF4444"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;color:#F59E0B"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
      info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;color:#3B82F6"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };

    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    container.appendChild(t);

    setTimeout(() => {
      t.classList.add('leaving');
      t.addEventListener('animationend', () => t.remove());
    }, duration);
  }

  // ── Lead Scoring ──────────────────────────

  function calcScore(lead) {
    let score = 0;
    const stageScores = { cold: 10, contacted: 25, survey: 50, negotiation: 70, closing: 85, installed: 100, lost: 0 };
    score += stageScores[lead.status] || 0;
    if (lead.no_wa) score = Math.min(100, score + 5);
    if (lead.address) score = Math.min(100, score + 5);
    if (lead.note) score = Math.min(100, score + 5);
    return score;
  }

  function getScoreClass(score) {
    if (score >= CONFIG.SCORE.HOT) return 'hot';
    if (score >= CONFIG.SCORE.WARM) return 'warm';
    return 'cold-score';
  }

  function getScoreColor(score) {
    if (score >= CONFIG.SCORE.HOT) return '#F97316';
    if (score >= CONFIG.SCORE.WARM) return '#F59E0B';
    return '#64748B';
  }

  // ── Pipeline Helpers ──────────────────────

  function getStage(id) {
    return CONFIG.PIPELINE_STAGES.find(s => s.id === id) || CONFIG.PIPELINE_STAGES[0];
  }

  function getBadgeHTML(status) {
    const s = getStage(status);
    return `<span class="badge badge-${status}"><span class="badge-dot" style="background:${s.color}"></span>${s.label}</span>`;
  }

  // ── WA Helper ────────────────────────────

  function waLink(phone, message = '') {
    const p = formatPhone(phone);
    const msg = encodeURIComponent(message);
    return `https://wa.me/${p}${msg ? '?text=' + msg : ''}`;
  }

  // ── Debounce ──────────────────────────────

  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  }

  // ── Storage ──────────────────────────────

  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('Storage error:', e); }
  }

  function retrieve(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  }

  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) { console.warn('Storage error:', e); }
  }

  // ── Validation ────────────────────────────

  function isValidPhone(phone) {
    return /^[0-9+\-\s]{8,15}$/.test(phone);
  }

  function isEmpty(val) {
    return val === null || val === undefined || val === '';
  }

  // ── Sort ──────────────────────────────────

  function sortByDate(arr, key, asc = false) {
    return [...arr].sort((a, b) => {
      const da = new Date(a[key] || 0);
      const db = new Date(b[key] || 0);
      return asc ? da - db : db - da;
    });
  }

  // Public API
  return {
    formatDate, formatDateTime, formatDateInput,
    isOverdue, isToday, today, relativeTime, getDayMonth, daysUntil,
    initials, truncate, slugify, formatPhone, formatCurrency, generateId,
    $, $$, el, setHTML, setText, show, hide,
    toast, calcScore, getScoreClass, getScoreColor,
    getStage, getBadgeHTML, waLink,
    debounce, store, retrieve, remove,
    isValidPhone, isEmpty, sortByDate,
  };
})();
