'use strict';
/* Zerodocs control — personal planner. Data: Google Drive (Zero/zero-data.json). Events: Google Calendar. */

const CFG = {
  clientId: '308212712343-gge24ldmng1opr3vq44dllp3eflmm7lq.apps.googleusercontent.com',
  scopes: [
    'openid', 'email',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
    'https://www.googleapis.com/auth/drive.file'
  ].join(' '),
  folder: 'Zero',
  file: 'zero-data.json'
};
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const DRV = 'https://www.googleapis.com/drive/v3';
const UPL = 'https://www.googleapis.com/upload/drive/v3';
const CAL = 'https://www.googleapis.com/calendar/v3';

/* ---------------- utils ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const now = () => Date.now();
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); };
const addD = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ymd(d); };
const today = () => ymd(new Date());
const diffD = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
const fmtDay = (s, o = { weekday: 'long', day: 'numeric', month: 'long' }) => pd(s).toLocaleDateString('en-GB', o);
const shortDay = s => fmtDay(s, { day: 'numeric', month: 'short' });
const hm = iso => { const d = new Date(iso); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const isoDay = iso => ymd(new Date(iso));
function relDay(s) {
  const d = diffD(today(), s);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  if (d > 1 && d < 7) return fmtDay(s, { weekday: 'short' });
  return shortDay(s);
}
const LS = {
  get(k, d) { try { const v = localStorage.getItem('zero.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('zero.' + k, JSON.stringify(v)); } catch { } },
  del(k) { try { localStorage.removeItem('zero.' + k); } catch { } }
};
let toastT;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2400);
}

const I = {
  plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  plusS: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  l: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  r: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>',
  rep: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
  note: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  gear: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  link: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
  trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  sync: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15.5 6.2"/><path d="M3 12A9 9 0 0 1 18.5 5.8"/><path d="M18 2v4h-4"/><path d="M6 22v-4h4"/></svg>',
  img: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  zero: '<svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="17" fill="none" stroke="#EDEDED" stroke-width="7"/></svg>'
};

/* ---------------- data ---------------- */
const freshDb = () => ({ v: 1, tasks: {}, projects: {}, notes: {}, lists: {}, log: {}, prefs: { updatedAt: 0 } });
let db = LS.get('db', null) || freshDb();
if (!db.prefs) db.prefs = { updatedAt: 0 };
if (!db.notes) db.notes = {};
if (!db.lists) db.lists = {};

/* the five sections of life/work; every task and project can belong to one */
const AREAS = [
  { id: 'personal', name: 'Personal', color: '#9CC2A4', al: ['personal', 'شخصي', 'شخصية'] },
  { id: 'housing', name: 'Housing', color: '#D9B48F', al: ['housing', 'سكن', 'الإسكان', 'الاسكان', 'اسكان', 'إسكان'] },
  { id: 'zerodocs', name: 'Zerodocs', color: '#93AFC2', al: ['zerodocs', 'زيرودوكس', 'زيرو_دوكس'] },
  { id: 'outsource', name: 'Outsource', color: '#B7A4D0', al: ['outsource', 'اوتسورس', 'أوتسورس', 'آوتسورس'] },
  { id: 'dorba', name: 'Dorba', color: '#E39A86', al: ['dorba', 'دربة', 'دربه'] }
];
const areaOf = id => AREAS.find(a => a.id === id) || null;
const findArea = s => { const n = String(s || '').toLowerCase(); return AREAS.find(a => a.al.includes(n)) || null; };
const taskArea = t => t.areaId || (t.projectId && db.projects[t.projectId] && db.projects[t.projectId].areaId) || null;
const notes = () => Object.values(db.notes).filter(n => !n.deleted).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
const adot = a => a ? `<i class="adot" style="background:${a.color}"></i>` : '';

function persist() { LS.set('db', db); }
function save() { persist(); LS.set('dirty', true); scheduleSync(); }

const tasks = () => Object.values(db.tasks).filter(t => !t.deleted);
const projects = () => Object.values(db.projects).filter(p => !p.deleted).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
const areaProjects = aid => projects().filter(p => (p.areaId || null) === (aid || null));
const projName = id => (id && db.projects[id] && !db.projects[id].deleted ? db.projects[id].name : '');
const stageName = (pid, sid) => { const p = db.projects[pid]; const s = p && (p.stages || []).find(x => x.id === sid); return s ? s.name : ''; };
const isOverdue = t => !t.done && t.due && t.due < today();
const isUrgent = t => !t.done && (t.urgent || isOverdue(t));
function byDue(a, b) {
  const da = a.due || '9999', dbb = b.due || '9999';
  if (da !== dbb) return da < dbb ? -1 : 1;
  const ta = a.time || '99', tb = b.time || '99';
  if (ta !== tb) return ta < tb ? -1 : 1;
  return (a.createdAt || '') < (b.createdAt || '') ? -1 : 1;
}

function addLog(type, t, extra = {}) {
  const id = uid();
  db.log[id] = {
    id, at: new Date().toISOString(), type, taskId: t.id, title: t.title,
    project: projName(t.projectId), stage: stageName(t.projectId, t.stageId), projectId: t.projectId || null, areaId: taskArea(t),
    due: t.due || null, repeat: t.repeat ? t.repeat.freq : null, urgent: !!t.urgent,
    ...extra, updatedAt: now()
  };
}
function newTask(p = {}) {
  const t = {
    id: uid(), title: '', notes: '', due: null, time: null, urgent: false, areaId: null, projectId: null, stageId: null,
    subtasks: [], links: [], images: [], repeat: null, done: false, doneAt: null, postponed: 0,
    createdAt: new Date().toISOString(), updatedAt: now(), deleted: false, ...p
  };
  db.tasks[t.id] = t;
  addLog('created', t);
  save();
  return t;
}
function upd(t, patch) { Object.assign(t, patch, { updatedAt: now() }); save(); }
function setDue(t, d) {
  d = d || null;
  if (t.due && d && d > t.due && !t.done) {
    t.postponed = (t.postponed || 0) + 1;
    addLog('postponed', t, { from: t.due, to: d });
  }
  const patch = { due: d };
  if (t.repeat && t.repeat.freq === 'monthly' && d) patch.repeat = { ...t.repeat, day: pd(d).getDate() };
  upd(t, patch);
}
function nextOcc(s, r) {
  const n = r.interval || 1; const d = pd(s);
  if (r.freq === 'daily') d.setDate(d.getDate() + n);
  else if (r.freq === 'weekly') d.setDate(d.getDate() + 7 * n);
  else if (r.freq === 'monthly') {
    const day = r.day || d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + n);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
  } else if (r.freq === 'yearly') d.setFullYear(d.getFullYear() + n);
  else d.setDate(d.getDate() + 1);
  return ymd(d);
}
const repLabel = r => r ? ({ daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' })[r.freq] || 'Repeats' : '';
function toggleDone(t) {
  const td = today();
  if (t.repeat && !t.done) {
    const due = t.due || td;
    addLog('done', t, { due, late: due < td ? diffD(due, td) : 0, subtasks: (t.subtasks || []).filter(s => s.done).length + '/' + (t.subtasks || []).length });
    const next = nextOcc(due, t.repeat);
    upd(t, { due: next, subtasks: (t.subtasks || []).map(s => ({ ...s, done: false })), lastDoneAt: new Date().toISOString() });
    toast('Done · next ' + relDay(next));
    return;
  }
  if (!t.done) {
    addLog('done', t, { late: t.due && t.due < td ? diffD(t.due, td) : 0, subtasks: (t.subtasks || []).filter(s => s.done).length + '/' + (t.subtasks || []).length });
    upd(t, { done: true, doneAt: new Date().toISOString() });
  } else {
    addLog('undone', t);
    upd(t, { done: false, doneAt: null });
  }
}
function newProject(name, areaId = null) {
  const p = { id: uid(), name, areaId: areaId || null, deadline: null, stages: [], createdAt: new Date().toISOString(), updatedAt: now(), deleted: false };
  db.projects[p.id] = p; save(); return p;
}
function findProject(name, areaId) {
  const n = name.toLowerCase().replace(/[\s_]+/g, '');
  const k = p => p.name.toLowerCase().replace(/\s+/g, '');
  const pool = areaId ? [...areaProjects(areaId), ...projects()] : projects();
  return pool.find(p => k(p) === n) || pool.find(p => k(p).startsWith(n));
}
function newNote(text = '') {
  const n = { id: uid(), title: '', text, createdAt: new Date().toISOString(), updatedAt: now(), deleted: false };
  db.notes[n.id] = n; save(); return n;
}

/* ---------------- merge ---------------- */
function mergeMap(a = {}, b = {}) {
  const o = { ...a };
  for (const k in b) if (!o[k] || (b[k].updatedAt || 0) > (o[k].updatedAt || 0)) o[k] = b[k];
  return o;
}
function merge(l, r) {
  return {
    v: 1,
    tasks: mergeMap(l.tasks, r.tasks),
    projects: mergeMap(l.projects, r.projects),
    notes: mergeMap(l.notes, r.notes),
    lists: mergeMap(l.lists, r.lists),
    log: mergeMap(l.log, r.log),
    prefs: ((r.prefs && r.prefs.updatedAt) || 0) > ((l.prefs && l.prefs.updatedAt) || 0) ? r.prefs : (l.prefs || { updatedAt: 0 })
  };
}

/* ---------------- auth ---------------- */
const NATIVE = !!window.ZeroNative; /* running inside the Android app */
const APK_URL = 'https://github.com/9effrr/zero/releases/latest/download/zero-widget.apk';
let token = LS.get('token', null);
let tokenClient = null, waiters = [], authErr = false;
const authed = () => !!(token && token.exp > now() + 60e3);
function gisReady() {
  if (!document.getElementById('gsi')) { const sc = document.createElement('script'); sc.id = 'gsi'; sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; document.head.appendChild(sc); }
  return new Promise(res => {
    const ok = () => window.google && google.accounts && google.accounts.oauth2;
    if (ok()) return res();
    const iv = setInterval(() => { if (ok()) { clearInterval(iv); res(); } }, 100);
  });
}
async function initAuth() {
  if (tokenClient || NATIVE) return;
  await gisReady();
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CFG.clientId, scope: CFG.scopes,
    callback: onToken, error_callback: onTokenErr
  });
}
function onToken(r) {
  nativePending = false;
  if (r.error) { authErr = true; failWaiters(r.error); renderMain(); return; }
  const ok = NATIVE || google.accounts.oauth2.hasGrantedAllScopes(r,
    'https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/drive.file');
  if (!ok) toast('Zerodocs control needs Calendar and Drive access to sync');
  token = { access_token: r.access_token, exp: now() + (r.expires_in || 3600) * 1000 };
  LS.set('token', token);
  const first = !LS.get('signedIn', false);
  LS.set('signedIn', true);
  authErr = false;
  const w = waiters; waiters = []; w.forEach(x => x.res(token.access_token));
  afterAuth();
}
function onTokenErr(e) { nativePending = false; authErr = true; failWaiters((e && e.type) || 'auth'); renderMain(); }
function failWaiters(e) { const w = waiters; waiters = []; w.forEach(x => x.rej(new Error('auth:' + e))); }
/* the Android app answers ZeroNative.auth() through this callback */
window.__zeroAuth = (t, err, email) => {
  if (email && !LS.get('email', '')) LS.set('email', email);
  if (t) onToken({ access_token: t, expires_in: 3300 }); else onTokenErr({ type: err || 'auth' });
};
window.__zeroBack = () => { if (ui.sheet) { closeSheet(); return true; } return false; };
let nativePending = false;
function nativeAuth(interactive) { if (nativePending && !interactive) return; nativePending = true; try { ZeroNative.auth(!!interactive); } catch (e) { nativePending = false; } }
async function connect(consent) {
  if (NATIVE) { nativeAuth(true); return; }
  await initAuth();
  tokenClient.requestAccessToken({ prompt: consent ? 'consent' : '', login_hint: LS.get('email', '') || undefined });
}
function getToken() {
  if (authed()) return Promise.resolve(token.access_token);
  if (NATIVE && LS.get('signedIn', false)) return new Promise((res, rej) => { waiters.push({ res, rej }); nativeAuth(false); });
  return Promise.reject(new Error('auth:expired'));
}
async function gfetch(url, opts = {}, retried = false) {
  const t = await getToken();
  const r = await fetch(url, { ...opts, headers: { Authorization: 'Bearer ' + t, ...(opts.headers || {}) } });
  if (r.status === 401) {
    token = null; LS.del('token');
    if (NATIVE && !retried) { try { ZeroNative.clearToken(t); } catch { } return gfetch(url, opts, true); }
    renderMain(); throw new Error('auth:401');
  }
  if (!r.ok) { const txt = await r.text(); const e = new Error(r.status + ' ' + txt.slice(0, 300)); e.status = r.status; throw e; }
  return r;
}
async function afterAuth() {
  renderMain();
  try {
    if (!LS.get('email', '')) {
      const r = await gfetch('https://www.googleapis.com/oauth2/v3/userinfo');
      const j = await r.json(); LS.set('email', j.email || '');
    }
  } catch (e) { console.warn(e); }
  try { await loadCals(); } catch (e) { console.warn(e); }
  refreshMonth(ui.month, true);
  sync();
}
function signOut() {
  if (!confirm('Sign out of Zerodocs control on this device? Your data stays safe in your Google Drive.')) return;
  try { if (NATIVE) ZeroNative.signOut(); } catch { }
  try { if (token && window.google) google.accounts.oauth2.revoke(token.access_token, () => { }); } catch { }
  ['token', 'signedIn', 'email', 'fileId', 'folderId', 'imgFolderId', 'db', 'cals', 'events', 'dirty', 'lastSync'].forEach(LS.del);
  token = null; db = freshDb(); evCache = {}; cals = [];
  ui.sheet = null; renderSheet(); renderMain();
}

/* ---------------- drive ---------------- */
async function findOne(q) {
  const r = await gfetch(`${DRV}/files?q=${encodeURIComponent(q)}&spaces=drive&fields=files(id,name)&pageSize=1`);
  const j = await r.json(); return j.files && j.files[0];
}
async function ensureFolder() {
  let id = LS.get('folderId', null); if (id) return id;
  const f = await findOne(`name='${CFG.folder}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  if (f) id = f.id;
  else {
    const r = await gfetch(`${DRV}/files?fields=id`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: CFG.folder, mimeType: 'application/vnd.google-apps.folder' })
    });
    id = (await r.json()).id;
  }
  LS.set('folderId', id); return id;
}
async function createFile(name, content, mime, parent) {
  const b = 'zero' + uid();
  const body = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [parent], mimeType: mime })}\r\n--${b}\r\nContent-Type: ${mime}; charset=UTF-8\r\n\r\n${content}\r\n--${b}--`;
  const r = await gfetch(`${UPL}/files?uploadType=multipart&fields=id,webViewLink`, {
    method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body
  });
  return r.json();
}
async function ensureDataFile() {
  let id = LS.get('fileId', null);
  if (id) return { id, created: false };
  const folder = await ensureFolder();
  const f = await findOne(`name='${CFG.file}' and '${folder}' in parents and trashed=false`);
  if (f) { LS.set('fileId', f.id); return { id: f.id, created: false }; }
  const nf = await createFile(CFG.file, JSON.stringify(db), 'application/json', folder);
  LS.set('fileId', nf.id); return { id: nf.id, created: true };
}
async function readRemote(id) {
  const r = await gfetch(`${DRV}/files/${id}?alt=media`);
  const txt = await r.text();
  try { return { data: JSON.parse(txt), txt }; } catch { return { data: null, txt }; }
}
async function writeRemote(id, txt) {
  await gfetch(`${UPL}/files/${id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: txt });
}

/* ---------------- images (Drive › Zero › images, cached on the device) ---------------- */
const IDB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('zero-img', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('b');
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  async get(k) { const d = await this.open(); return new Promise(res => { const q = d.transaction('b').objectStore('b').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); },
  async put(k, v) { const d = await this.open(); return new Promise(res => { const tx = d.transaction('b', 'readwrite'); tx.objectStore('b').put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => res(false); }); },
  async del(k) { const d = await this.open(); return new Promise(res => { const tx = d.transaction('b', 'readwrite'); tx.objectStore('b').delete(k); tx.oncomplete = () => res(true); tx.onerror = () => res(false); }); }
};
const imgURL = {};
async function imgSrc(id) {
  if (imgURL[id]) return imgURL[id];
  let b = null;
  try { b = await IDB.get(id); } catch { }
  if (!b && !id.startsWith('l_') && authed() && navigator.onLine) {
    try { const r = await gfetch(`${DRV}/files/${id}?alt=media`); b = await r.blob(); IDB.put(id, b).catch(() => { }); } catch (e) { console.warn(e); }
  }
  if (!b) return null;
  return (imgURL[id] = URL.createObjectURL(b));
}
function hydrateImgs(root = document) {
  root.querySelectorAll('img[data-img]').forEach(async el => {
    if (el.dataset.done) return; el.dataset.done = '1';
    const src = await imgSrc(el.dataset.img);
    if (src) el.src = src; else el.closest('.ph') && el.closest('.ph').classList.add('missing');
  });
}
async function compressImage(file) {
  let src, w, h;
  try { src = await createImageBitmap(file); w = src.width; h = src.height; }
  catch {
    src = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(file); });
    w = src.naturalWidth; h = src.naturalHeight;
  }
  const k = Math.min(1, 1600 / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(b => res(b), 'image/jpeg', 0.82));
}
async function addImages(t, files) {
  let n = 0;
  for (const f of files) {
    try {
      const b = await compressImage(f); if (!b) continue;
      const id = 'l_' + uid(); await IDB.put(id, b);
      t.images = [...(t.images || []), { id, local: true, at: now() }]; t.updatedAt = now(); n++;
    } catch (e) { console.error(e); }
  }
  if (!n) { toast('Could not add that image'); return; }
  save(); renderSheet(); renderMain(); uploadImages();
}
async function ensureImgFolder() {
  let id = LS.get('imgFolderId', null); if (id) return id;
  const parent = await ensureFolder();
  const f = await findOne(`name='images' and '${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  if (f) id = f.id;
  else {
    const r = await gfetch(`${DRV}/files?fields=id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'images', parents: [parent], mimeType: 'application/vnd.google-apps.folder' }) });
    id = (await r.json()).id;
  }
  LS.set('imgFolderId', id); return id;
}
async function uploadBlob(name, blob, parent) {
  const bd = 'zero' + uid();
  const meta = JSON.stringify({ name, parents: [parent], mimeType: 'image/jpeg' });
  const body = new Blob([`--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${bd}\r\nContent-Type: image/jpeg\r\n\r\n`, blob, `\r\n--${bd}--`]);
  const r = await gfetch(`${UPL}/files?uploadType=multipart&fields=id`, { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + bd }, body });
  return (await r.json()).id;
}
let uploadingImgs = false;
async function uploadImages() {
  if (uploadingImgs || !authed() || !navigator.onLine) return;
  const pending = tasks().filter(t => (t.images || []).some(i => i.local));
  if (!pending.length) return;
  uploadingImgs = true;
  try {
    const folder = await ensureImgFolder();
    for (const t of pending) {
      for (const im of [...(t.images || [])]) {
        if (!im.local) continue;
        const b = await IDB.get(im.id);
        if (!b) continue;
        const id = await uploadBlob(`${(t.title || 'task').slice(0, 40)} ${im.id}.jpg`, b, folder);
        await IDB.put(id, b);
        if (imgURL[im.id]) imgURL[id] = imgURL[im.id];
        const cur = db.tasks[t.id];
        cur.images = (cur.images || []).map(x => x.id === im.id ? { id, at: x.at } : x); cur.updatedAt = now();
        IDB.del(im.id); save();
        if (ui.sheet && ui.sheet.type === 'image' && ui.sheet.img === im.id) ui.sheet.img = id;
      }
    }
    if (ui.sheet && (ui.sheet.type === 'task' || ui.sheet.type === 'image')) renderSheet();
  } catch (e) { console.error(e); }
  finally { uploadingImgs = false; }
}
function removeImage(t, id) {
  t.images = (t.images || []).filter(x => x.id !== id); t.updatedAt = now(); save();
  if (id.startsWith('l_')) IDB.del(id);
  else if (authed() && navigator.onLine) gfetch(`${DRV}/files/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) }).catch(() => { });
}

/* ---------------- sync ---------------- */
let syncing = false, again = false, syncTimer = null, syncState = 'idle';
function setSync(s) {
  syncState = s;
  document.querySelectorAll('.sync-dot').forEach(el => { el.className = 'sync-dot ' + ({ ok: 'ok', busy: 'busy', err: 'err' }[s] || ''); });
}
function scheduleSync(ms = 1500) { clearTimeout(syncTimer); syncTimer = setTimeout(sync, ms); }
async function sync(retried) {
  if (!navigator.onLine || !authed()) { setSync('idle'); return; }
  if (syncing) { again = true; return; }
  syncing = true; setSync('busy');
  try {
    let { id, created } = await ensureDataFile();
    if (!created) {
      let remote;
      try { remote = await readRemote(id); }
      catch (e) {
        if (e.status === 404 && !retried) { LS.del('fileId'); LS.del('folderId'); syncing = false; return sync(true); }
        throw e;
      }
      if (remote.data && remote.data.tasks) db = merge(db, remote.data);
      persist();
      const txt = JSON.stringify(db);
      if (txt !== remote.txt) await writeRemote(id, txt);
    }
    LS.set('dirty', false); LS.set('lastSync', now());
    setSync('ok');
    softRender();
    uploadImages();
  } catch (e) {
    console.error(e); setSync('err');
  } finally {
    syncing = false;
    if (again) { again = false; scheduleSync(300); }
  }
}

/* ---------------- calendar ---------------- */
let cals = LS.get('cals', []);
let evCache = LS.get('events', {});
const evFetched = {};
async function loadCals() {
  const r = await gfetch(`${CAL}/users/me/calendarList?minAccessRole=reader&fields=items(id,summary,summaryOverride,backgroundColor,primary,selected,accessRole)`);
  const j = await r.json();
  cals = (j.items || []).map(c => ({
    id: c.id, name: c.summaryOverride || c.summary, color: c.backgroundColor, primary: !!c.primary,
    selected: !!c.selected || !!c.primary, writable: c.accessRole === 'owner' || c.accessRole === 'writer'
  }));
  LS.set('cals', cals);
}
function visibleCals() {
  const hidden = db.prefs.hiddenCals || [];
  const v = cals.filter(c => c.selected && !hidden.includes(c.id));
  return cals.length ? v : [{ id: 'primary', name: 'Calendar', writable: true, primary: true }];
}
function gridRange(m) {
  const first = pd(m + '-01');
  const start = new Date(first); start.setDate(1 - first.getDay());
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const end = new Date(last); end.setDate(last.getDate() + (6 - last.getDay()));
  return { start: ymd(start), end: ymd(end) };
}
function normEv(e, c) {
  const allDay = !!(e.start && e.start.date);
  return {
    id: e.id, calId: c.id, calName: c.name || '', title: e.summary || '(No title)', allDay,
    start: allDay ? e.start.date : e.start.dateTime, end: allDay ? e.end.date : e.end.dateTime,
    location: e.location || '', desc: e.description || '', link: e.htmlLink || '', recurring: !!e.recurringEventId,
    writable: c.writable !== false
  };
}
async function fetchEvents(from, to) {
  const tmin = pd(from).toISOString(), tmax = pd(addD(to, 1)).toISOString();
  const out = [];
  await Promise.all(visibleCals().map(async c => {
    let pageToken = '';
    do {
      const r = await gfetch(`${CAL}/calendars/${encodeURIComponent(c.id)}/events?singleEvents=true&orderBy=startTime&maxResults=2500&timeMin=${encodeURIComponent(tmin)}&timeMax=${encodeURIComponent(tmax)}${pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''}`);
      const j = await r.json();
      (j.items || []).forEach(e => {
        if (e.status === 'cancelled') return;
        const me = (e.attendees || []).find(a => a.self);
        if (me && me.responseStatus === 'declined') return;
        out.push(normEv(e, c));
      });
      pageToken = j.nextPageToken || '';
    } while (pageToken);
  }));
  out.sort((a, b) => (a.start < b.start ? -1 : 1));
  return out;
}
async function refreshMonth(m, force) {
  if (!authed() || !navigator.onLine) return;
  if (!force && evFetched[m] && now() - evFetched[m] < 90e3) return;
  evFetched[m] = now();
  try {
    const { start, end } = gridRange(m);
    evCache[m] = await fetchEvents(start, end);
    const keys = Object.keys(evCache).sort();
    while (keys.length > 8) delete evCache[keys.shift()];
    LS.set('events', evCache);
    softRender();
  } catch (e) { console.warn(e); evFetched[m] = 0; }
}
function evKey(e) { return e.calId + '|' + e.id; }
function unionEvents() {
  const m = new Map();
  Object.keys(evCache).sort().forEach(k => evCache[k].forEach(e => m.set(evKey(e), e)));
  if (evCache[ui.month]) evCache[ui.month].forEach(e => m.set(evKey(e), e));
  return [...m.values()];
}
function findEv(k) { return unionEvents().find(e => evKey(e) === k) || (ui.rEvents || []).find(e => evKey(e) === k); }
function evDays(e) {
  const out = [];
  if (e.allDay) { let d = e.start; while (d < e.end && out.length < 62) { out.push(d); d = addD(d, 1); } return out.length ? out : [e.start]; }
  let d = isoDay(e.start); const last = ymd(new Date(new Date(e.end).getTime() - 1));
  while (d <= last && out.length < 62) { out.push(d); d = addD(d, 1); }
  return out.length ? out : [isoDay(e.start)];
}
const evTime = e => e.allDay ? 'All day' : `${hm(e.start)} – ${hm(e.end)}`;
function evBody(f) {
  const b = { summary: f.title || '(No title)', location: f.location || '', description: f.desc || '' };
  if (f.allDay) {
    b.start = { date: f.date, dateTime: null };
    b.end = { date: addD(f.endDate && f.endDate >= f.date ? f.endDate : f.date, 1), dateTime: null };
  } else {
    b.start = { dateTime: `${f.date}T${f.start}:00`, timeZone: TZ, date: null };
    let endDate = f.date; if (f.end <= f.start) endDate = addD(f.date, 1);
    b.end = { dateTime: `${endDate}T${f.end}:00`, timeZone: TZ, date: null };
  }
  return b;
}
async function saveEvent() {
  const s = ui.sheet; const f = s.draft;
  if (!f.title.trim()) { toast('Add a title'); return; }
  if (!authed() || !navigator.onLine) { toast('Connect to the internet and Google first'); return; }
  s.busy = true; renderSheet();
  try {
    const body = evBody(f);
    if (s.ev) {
      await gfetch(`${CAL}/calendars/${encodeURIComponent(s.ev.calId)}/events/${encodeURIComponent(s.ev.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      delete body.start.date; delete body.end.date;
      if (f.allDay) { delete body.start.dateTime; delete body.end.dateTime; }
      await gfetch(`${CAL}/calendars/${encodeURIComponent(f.calId || 'primary')}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    ui.sel = f.date; ui.month = f.date.slice(0, 7);
    toast(s.ev ? 'Event updated in Google Calendar' : 'Added to Google Calendar');
    closeSheet();
    await refreshMonth(ui.month, true);
  } catch (e) {
    console.error(e); s.busy = false; renderSheet();
    toast(String(e.message).startsWith('auth') ? 'Reconnect Google, then try again' : 'Could not save the event');
  }
}
async function deleteEvent() {
  const ev = ui.sheet && ui.sheet.ev; if (!ev) return;
  if (!confirm(`Delete “${ev.title}” from Google Calendar?`)) return;
  try {
    await gfetch(`${CAL}/calendars/${encodeURIComponent(ev.calId)}/events/${encodeURIComponent(ev.id)}`, { method: 'DELETE' });
    Object.keys(evCache).forEach(k => { evCache[k] = evCache[k].filter(e => evKey(e) !== evKey(ev)); });
    LS.set('events', evCache);
    toast('Event deleted'); closeSheet();
    refreshMonth(ui.month, true);
  } catch (e) { console.error(e); toast('Could not delete the event'); }
}

/* ---------------- quick add parser ---------------- */
function normDigits(s) { return s.replace(/[٠-٩۰-۹]/g, c => { const k = c.charCodeAt(0); return String(k >= 1776 ? k - 1776 : k - 1632); }); }
const WD = [
  ['الأحد', 'الاحد', 'احد', 'sunday', 'sun'],
  ['الاثنين', 'الإثنين', 'اثنين', 'monday', 'mon'],
  ['الثلاثاء', 'الثلاثا', 'ثلاثاء', 'tuesday', 'tue'],
  ['الأربعاء', 'الاربعاء', 'اربعاء', 'أربعاء', 'wednesday', 'wed'],
  ['الخميس', 'خميس', 'thursday', 'thu'],
  ['الجمعة', 'الجمعه', 'جمعة', 'friday', 'fri'],
  ['السبت', 'سبت', 'saturday', 'sat']
];
function parseQuick(raw) {
  let s = ' ' + normDigits(raw).replace(/\s+/g, ' ').trim() + ' ';
  const r = { title: '', due: null, time: null, urgent: false, area: null, project: null, repeat: null, isEvent: false };
  const take = (re, fn) => { const m = s.match(re); if (m) { s = s.replace(m[0], ' '); fn(m); return true; } return false; };
  if (/^\s*@/.test(s)) { r.isEvent = true; s = s.replace('@', ' '); }
  for (let k = 0; k < 2; k++) take(/\s#([^\s#]+)/, m => { const a = findArea(m[1]); if (a) r.area = a.id; else r.project = m[1].replace(/_/g, ' '); });
  take(/\s(!|عاجل|مستعجل|urgent)(?=\s)/i, () => { r.urgent = true; });
  take(/\s(كل يوم|يومياً|يوميا|daily|every day)(?=\s)/i, () => { r.repeat = { freq: 'daily', interval: 1 }; }) ||
    take(/\s(كل أسبوع|كل اسبوع|أسبوعياً|اسبوعياً|أسبوعيا|اسبوعيا|weekly|every week)(?=\s)/i, () => { r.repeat = { freq: 'weekly', interval: 1 }; }) ||
    take(/\s(كل شهر|شهرياً|شهريا|monthly|every month)(?=\s)/i, () => { r.repeat = { freq: 'monthly', interval: 1 }; }) ||
    take(/\s(كل سنة|كل سنه|سنوياً|سنويا|yearly|every year)(?=\s)/i, () => { r.repeat = { freq: 'yearly', interval: 1 }; });
  const setT = (h, mi) => { if (h < 24 && mi < 60) r.time = pad(h) + ':' + pad(mi); };
  take(/\s(?:الساعة\s*|الساعه\s*|at\s*)?(\d{1,2})(?::(\d{2}))?\s*(صباحاً|صباحا|مساءً|مساء|ظهراً|ظهرا|عصراً|عصرا|ص|م|am|pm)(?=\s)/i, m => {
    let h = +m[1]; const mi = m[2] ? +m[2] : 0; const ap = m[3].toLowerCase();
    const pmw = /^(م|مساء|مساءً|pm|ظهرا|ظهراً|عصرا|عصراً)$/.test(ap);
    if (pmw && h < 12) h += 12; if (!pmw && h === 12) h = 0; setT(h, mi);
  }) ||
    take(/\s(?:الساعة\s*|الساعه\s*|at\s*)?(\d{1,2}):(\d{2})(?=\s)/i, m => setT(+m[1], +m[2])) ||
    take(/\s(?:الساعة|الساعه|at)\s*(\d{1,2})(?=\s)/i, m => setT(+m[1], 0));
  const t = today();
  const dateHit =
    take(/\s(بعد غد|بعد بكرة|بعد بكره)(?=\s)/, () => { r.due = addD(t, 2); }) ||
    take(/\s(اليوم|today)(?=\s)/i, () => { r.due = t; }) ||
    take(/\s(غداً|غدا|بكرة|بكره|tomorrow)(?=\s)/i, () => { r.due = addD(t, 1); }) ||
    take(/\s(الأسبوع القادم|الاسبوع القادم|الأسبوع الجاي|الاسبوع الجاي|next week)(?=\s)/i, () => { r.due = addD(t, 7); }) ||
    take(/\s(?:بعد|in)\s*(\d{1,3})\s*(أيام|ايام|يوم|days?)(?=\s)/i, m => { r.due = addD(t, +m[1]); }) ||
    take(/\s(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?(?=\s)/, m => {
      const d = +m[1], mo = +m[2]; let y = m[3] ? +m[3] : new Date().getFullYear(); if (y < 100) y += 2000;
      const dt = new Date(y, mo - 1, d);
      if (dt.getMonth() === mo - 1 && dt.getDate() === d) { if (!m[3] && ymd(dt) < t) dt.setFullYear(y + 1); r.due = ymd(dt); }
    });
  if (!dateHit) {
    for (let i = 0; i < 7; i++) {
      const re = new RegExp('\\s(?:يوم\\s)?(?:' + WD[i].join('|') + ')(?=\\s)', 'i');
      if (take(re, () => { let n = (i - new Date().getDay() + 7) % 7; if (n === 0) n = 7; r.due = addD(t, n); })) break;
    }
  }
  if (r.time && !r.due) r.due = t;
  r.title = s.replace(/\s+/g, ' ').trim();
  if (!r.isEvent && r.time && /^(اجتماع|موعد|لقاء|meeting|appointment|call)(\s|$)/i.test(r.title)) r.isEvent = true;
  return r;
}
function qaPreview(text) {
  if (!text.trim()) return '';
  const p = parseQuick(text); const c = [];
  if (p.isEvent) c.push('<span class="chip bl">Google event</span>');
  if (p.due) c.push(`<span class="chip">${esc(relDay(p.due))}</span>`);
  if (p.time) c.push(`<span class="chip">${esc(p.time)}</span>`);
  if (p.urgent) c.push('<span class="chip or">Urgent</span>');
  if (p.repeat) c.push(`<span class="chip">${I.rep} ${repLabel(p.repeat)}</span>`);
  if (p.area) { const a = areaOf(p.area); c.push(`<span class="chip">${adot(a)}${esc(a.name)}</span>`); }
  if (p.project) { const f = findProject(p.project, p.area || qaCtx().areaId); c.push(`<span class="chip">${f ? esc(f.name) : 'New project: ' + esc(p.project)}</span>`); }
  return c.length > 0 ? c.join('') : '';
}
function quickAdd(text, ctx = {}) {
  const p = parseQuick(text);
  if (!p.title) return false;
  if (p.isEvent) {
    openEventSheet(null, { title: p.title, date: p.due || ui.sel || today(), start: p.time || '09:00' });
    return true;
  }
  let areaId = p.area || ctx.areaId || null;
  let projectId = p.area && ctx.projectId && db.projects[ctx.projectId] && db.projects[ctx.projectId].areaId !== p.area ? null : (ctx.projectId || null);
  if (p.project) { const f = findProject(p.project, areaId); projectId = f ? f.id : newProject(p.project, areaId).id; }
  if (projectId && db.projects[projectId]) { const pa = db.projects[projectId].areaId; if (pa) areaId = pa; else if (areaId) upd(db.projects[projectId], { areaId }); }
  let repeat = p.repeat || ctx.repeat || null;
  let due = p.due || ctx.due || null;
  if (repeat && !due) due = today();
  if (repeat && repeat.freq === 'monthly') repeat = { ...repeat, day: pd(due).getDate() };
  newTask({ title: p.title, due, time: p.time, urgent: p.urgent, areaId, projectId, stageId: projectId === ctx.projectId ? ctx.stageId || null : null, repeat });
  toast(due ? 'Added · ' + relDay(due) : 'Added');
  return true;
}

/* ---------------- UI state ---------------- */
const VIEWS = ['home', 'notes', ...AREAS.map(a => a.id), 'review', 'project'];
const TABS = [['home', 'Home'], ['notes', 'Notes'], ...AREAS.map(a => [a.id, a.name]), ['review', 'Review']];
const ui = {
  view: LS.get('view', 'home'), month: today().slice(0, 7), sel: today(), projectId: LS.get('projectId', null),
  sheet: null, qa: '', rDays: 14, rFrom: null, rTo: null, rEvents: null, rKey: '', showDone: false,
  tFilter: 'all', nq: '', rArea: '', rProj: ''
};
if (ui.view === 'repeat') { ui.view = 'home'; ui.tFilter = 'repeat'; }
if (ui.view === 'tasks') ui.view = 'home'; /* the Tasks page now lives on Home */
if (!VIEWS.includes(ui.view)) ui.view = 'home';
if (ui.view === 'project' && !(ui.projectId && db.projects[ui.projectId] && !db.projects[ui.projectId].deleted)) ui.view = 'home';
/* what the quick-add bar should attach new tasks to, based on where you are */
function qaCtx() {
  if (ui.view === 'project' && ui.projectId && db.projects[ui.projectId]) return { projectId: ui.projectId, areaId: db.projects[ui.projectId].areaId || null };
  if (areaOf(ui.view)) return { areaId: ui.view };
  return {};
}

/* ---------------- rendering helpers ---------------- */
function buildIndex(start, end, evs) {
  const idx = {}; const get = d => idx[d] || (idx[d] = { ev: [], tk: [] });
  evs.forEach(e => evDays(e).forEach(d => { if (d >= start && d <= end) get(d).ev.push(e); }));
  tasks().forEach(t => {
    if (!t.due) return;
    if (t.due >= start && t.due <= end) get(t.due).tk.push({ t });
    if (t.repeat && !t.done && t.repeat.freq !== 'daily') {
      let d = nextOcc(t.due, t.repeat), g = 0;
      while (d <= end && g++ < 400) { if (d >= start) get(d).tk.push({ t, ghost: true, date: d }); d = nextOcc(d, t.repeat); }
    }
  });
  Object.values(db.log).forEach(l => {
    if (l.type === 'done' && l.repeat && l.due && l.due >= start && l.due <= end) {
      get(l.due).tk.push({ t: { id: l.taskId, title: l.title, projectId: null, done: true }, log: l });
    }
  });
  Object.values(idx).forEach(v => {
    v.ev.sort((a, b) => (a.allDay === b.allDay ? (a.start < b.start ? -1 : 1) : a.allDay ? -1 : 1));
    v.tk.sort((a, b) => ((a.t.time || '99') < (b.t.time || '99') ? -1 : 1));
  });
  return idx;
}
function taskMeta(t, o = {}) {
  const m = [];
  const a = areaOf(taskArea(t));
  if (a && !o.inArea) m.push(`<span class="achip">${adot(a)}${esc(a.name)}</span>`);
  const pn = o.inProject ? '' : projName(t.projectId);
  if (pn) m.push(`<span dir="auto">${esc(pn + (t.stageId && stageName(t.projectId, t.stageId) ? ' › ' + stageName(t.projectId, t.stageId) : ''))}</span>`);
  else if (o.inProject && t.stageId && stageName(t.projectId, t.stageId) && o.showStage) m.push(esc(stageName(t.projectId, t.stageId)));
  const st = t.subtasks || [];
  if (st.length) m.push(`${st.filter(s => s.done).length}/${st.length}`);
  if (t.repeat) m.push(`<span style="display:inline-flex;align-items:center;gap:3px">${I.rep}${repLabel(t.repeat)}</span>`);
  if ((t.notes && t.notes.trim()) || (t.images || []).length) m.push((t.images || []).length ? `<span style="display:inline-flex;align-items:center;gap:3px">${I.note}${(t.images || []).length}</span>` : I.note);
  if (o.date) m.push(esc(relDay(o.date)));
  else if (!o.hideDue && t.due) {
    const lbl = esc(relDay(t.due) + (t.time ? ' ' + t.time : ''));
    m.push(isOverdue(t) ? `<span class="or">${t.due < today() ? 'Overdue · ' : ''}${lbl}</span>` : (t.urgent && !t.done ? `<span class="or">${lbl}</span>` : lbl));
  } else if (t.time) m.push(esc(t.time));
  return m.join(' · ');
}
function taskHTML(t, o = {}) {
  if (o.log) {
    return `<div class="task isdone"><span class="chk done" aria-hidden="true">${I.check}</span><button class="b" data-act="open-task" data-id="${esc(t.id)}"><span class="tt" dir="auto">${esc(t.title)}</span><span class="mt">Done ${esc(hm(o.log.at))}</span></button></div>`;
  }
  const urg = isUrgent(t);
  const meta = taskMeta(t, o);
  return `<div class="task ${t.done ? 'isdone' : ''} ${o.ghost ? 'ghost' : ''}">
    ${o.ghost ? `<span class="chk" aria-hidden="true" style="border-style:dashed"></span>` :
      `<button class="chk ${urg ? 'urg' : ''} ${t.done ? 'done' : ''}" data-act="toggle" data-id="${esc(t.id)}" aria-label="${t.done ? 'Mark not done' : 'Complete'}: ${esc(t.title)}">${t.done ? I.check : ''}</button>`}
    <button class="b" data-act="open-task" data-id="${esc(t.id)}"><span class="tt" dir="auto">${esc(t.title || 'Untitled')}</span>${meta ? `<span class="mt">${meta}</span>` : ''}</button>
  </div>`;
}
function evHTML(e) {
  const meta = [evTime(e)]; if (e.location) meta.push(e.location);
  return `<button class="ev" data-act="open-ev" data-k="${esc(evKey(e))}"><span class="bar k-ev"></span><span class="b"><span class="tt" dir="auto">${esc(e.title)}</span><span class="mt" dir="auto">${esc(meta.join(' · '))}</span></span></button>`;
}
function sec(title, body, o = {}) {
  return `<section class="sec"><div class="sec-h"><h2 class="${o.cls || ''}">${o.html ? title : esc(title)}</h2>${o.right || ''}</div>${body}</section>`;
}
/* an add-row that works with every keyboard: Enter submits the form, and there is always a visible Add button */
function addForm(form, ph, o = {}) {
  return `<form class="inline-add ${o.cls || ''}" data-form="${form}" ${o.data || ''} autocomplete="off">${I.plusS}<input id="${o.id || 'f-' + form}" name="v" dir="auto" enterkeyhint="done" placeholder="${esc(ph)}" ${o.type ? `type="${o.type}" inputmode="${o.type}"` : ''}><button class="ia-go" type="submit">Add</button></form>`;
}
function syncDot() { return `<span class="sync-dot ${({ ok: 'ok', busy: 'busy', err: 'err' }[syncState] || '')}"></span>`; }
function sortOpen(list) { return [...list.filter(t => !t.done).sort(byDue), ...list.filter(t => t.done).sort((a, b) => ((a.doneAt || '') < (b.doneAt || '') ? 1 : -1))]; }
function projStats(p) {
  const ts = tasks().filter(t => t.projectId === p.id);
  const done = ts.filter(t => t.done).length;
  const overdue = ts.filter(isOverdue).length;
  return { total: ts.length, done, open: ts.length - done, overdue, pct: ts.length ? Math.round(done / ts.length * 100) : 0 };
}
function pcardHTML(p) {
  const s = projStats(p); const a = areaOf(p.areaId);
  return `<button class="card pcard ${p.done ? 'pdone' : ''}" data-act="open-project" data-id="${esc(p.id)}" style="${a ? '--ac:' + a.color : ''}">
    <span style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><span class="nm" dir="auto">${p.done ? `<span class="pdk">${I.check}</span>` : ''}${esc(p.name)}</span><span class="mut" style="font-size:12px;white-space:nowrap">${p.done ? 'Completed ' + esc(shortDay(isoDay(p.doneAt || new Date().toISOString()))) : p.deadline ? 'Due ' + esc(shortDay(p.deadline)) : ''}</span></span>
    <span class="prog"><i style="width:${s.pct}%"></i></span>
    <span class="mut" style="font-size:12px">${s.done} of ${s.total} done${s.overdue ? ` · <span class="or">${s.overdue} overdue</span>` : ''}${(p.stages || []).length ? ' · ' + p.stages.length + ' stages' : ''}</span></button>`;
}

/* ---------------- shell ---------------- */
function welcomeHTML() {
  return `<div class="welcome">
    <img class="brand-logo" src="logo.png" alt="Zerodocs" width="150" height="91">
    <h1>Zerodocs control</h1>
    <p>Your calendar, tasks, projects and notes in one quiet place. Everything is stored in your own Google Drive.</p>
    <button class="btn pri" data-act="connect-first">Connect Google</button>
    <p style="font-size:12px">Google will ask to allow Zerodocs control to see and edit your calendar events and the files it creates in your Drive.</p>
  </div>`;
}
function openCount(aid) { const td = today(); return tasks().filter(t => !t.done && t.due && t.due <= td && (aid === undefined || taskArea(t) === aid)).length; }
function curTab() { return ui.view === 'project' ? ((db.projects[ui.projectId] || {}).areaId || 'home') : ui.view; }
function sideHTML() {
  const cur = curTab();
  const nav = (v, label, extra = '', dot = '') => `<button class="nav ${cur === v ? 'on' : ''}" data-act="nav" data-v="${v}"><span style="display:flex;align-items:center;gap:9px;min-width:0">${dot}${label}</span>${extra}</button>`;
  const c = n => n ? `<span class="c">${n}</span>` : '';
  return `<nav class="side" aria-label="Main">
    <div class="brand"><img src="logo.png" alt="Zerodocs control" width="66" height="40" class="side-logo"> <button class="ib" data-act="settings" aria-label="Settings">${I.gear}</button></div>
    ${nav('home', 'Home')}
    ${nav('notes', 'Notes', c(notes().length))}
    <div class="grp">SECTIONS</div>
    ${AREAS.map(a => nav(a.id, esc(a.name), c(openCount(a.id)), adot(a))).join('')}
    <div class="grp"></div>
    ${nav('review', 'Review')}
    <div class="foot">${syncDot()}<span style="overflow:hidden;text-overflow:ellipsis">${esc(LS.get('email', '') || 'Not connected')}</span></div>
  </nav>`;
}
function qaPlaceholder() {
  if (ui.view === 'notes' || ui.view === 'home') return 'Write a quick note…';
  const c = qaCtx();
  if (c.projectId) return `Add to ${projName(c.projectId)}…`;
  if (c.areaId) return `Add to ${areaOf(c.areaId).name}… e.g. متابعة العقد غداً`;
  return 'Add… e.g. مونتاج غداً ٤م #zerodocs';
}
function qaHTML(id) {
  return `<form class="qa" data-form="qa" autocomplete="off"><label class="sr" for="${id}">Quick add</label>
    <input id="${id}" data-enter="qa" dir="auto" enterkeyhint="done" placeholder="${esc(qaPlaceholder())}" value="${esc(ui.qa)}">
    <button class="go" type="submit" aria-label="Add">${I.plus}</button></form>
    <div class="qa-prev" id="${id}-prev">${ui.view === 'notes' || ui.view === 'home' ? '' : qaPreview(ui.qa)}</div>`;
}
function bottomHTML() {
  const cur = curTab();
  const tab = ([v, l]) => { const a = areaOf(v); return `<button class="${cur === v ? 'on' : ''}" data-act="nav" data-v="${v}" ${cur === v ? 'aria-current="page"' : ''}>${a ? adot(a) : ''}${l}</button>`; };
  return `<nav class="bottom" aria-label="Main">${qaHTML('qa-m')}<div class="tabs" id="tabs">${TABS.map(tab).join('')}</div></nav>`;
}
function bannerHTML() {
  if (!navigator.onLine) return `<div class="card" style="padding:10px 14px;margin-bottom:14px;font-size:13px;color:var(--mut)">Offline — your changes are saved on this device and will sync when you're back online.</div>`;
  if (!authed()) return `<div class="card" style="padding:8px 8px 8px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px"><span class="mut">Google session paused.</span><button class="pill" data-act="connect">Reconnect</button></div>`;
  return '';
}
let tabsScroll = 0;
function renderMain() {
  const app = $('#app');
  if (!LS.get('signedIn', false)) { app.innerHTML = welcomeHTML(); return; }
  const a = document.activeElement;
  const keep = a && a.id && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && !a.closest('.sheet, .writer') ? { id: a.id, v: a.value, s: a.selectionStart, e: a.selectionEnd } : null;
  const ot = $('#tabs'); if (ot) tabsScroll = ot.scrollLeft;
  app.innerHTML = `<div class="shell">${sideHTML()}<main class="main" id="main"><div class="mob-top"><img src="logo.png" alt="Zerodocs control" width="52" height="32" class="mob-logo"><button class="ib" data-act="settings" aria-label="Settings">${I.gear}</button></div>${bannerHTML()}${ui.view === 'home' ? '' : `<div class="qa-top">${qaHTML('qa-d')}</div>`}${viewHTML()}</main>${bottomHTML()}</div>`;
  const tb = $('#tabs');
  if (tb) {
    tb.scrollLeft = tabsScroll;
    const on = tb.querySelector('.on');
    if (on && (on.offsetLeft < tb.scrollLeft || on.offsetLeft + on.offsetWidth > tb.scrollLeft + tb.clientWidth)) tb.scrollLeft = on.offsetLeft - (tb.clientWidth - on.offsetWidth) / 2;
  }
  if (keep) { const el = document.getElementById(keep.id); if (el) { el.value = keep.v; el.focus(); try { el.setSelectionRange(keep.s, keep.e); } catch { } } }
  if (ui.view === 'notes') drawThumbs();
}
function softRender() {
  const a = document.activeElement;
  if (a && a.closest && a.closest('.sheet, .writer') && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) { renderMain(); return; }
  renderMain(); if (ui.sheet && ui.sheet.type !== 'event') renderSheet();
}
function viewHTML() {
  if (areaOf(ui.view)) return areaView(areaOf(ui.view));
  switch (ui.view) {
    case 'notes': return notesView();
    case 'project': return ui.projectId && db.projects[ui.projectId] && !db.projects[ui.projectId].deleted ? projectView(db.projects[ui.projectId]) : homeView();
    case 'review': return reviewView();
    default: return homeView();
  }
}


/* ---------------- to-do lists & trackers ----------------
   A list is a checklist. If it repeats (daily / weekly / monthly) its ticks start fresh every
   period and the old periods are kept, so it works as a habit or money tracker. */
const LIST_AREAS = ['personal'];
const REPS = [['', 'Once'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']];
const lists = (areaId, kind) => Object.values(db.lists || {}).filter(l => !l.deleted && (!areaId || l.areaId === areaId) && (!kind || (kind === 'habit' ? l.kind === 'habit' : l.kind !== 'habit'))).sort((a, b) => (a.createdAt || '') < (b.createdAt || '') ? -1 : 1);
function periodKey(rep, d = today()) {
  if (rep === 'daily') return d;
  if (rep === 'weekly') return addD(d, -pd(d).getDay());
  if (rep === 'monthly') return d.slice(0, 7);
  return 'all';
}
function prevPeriod(rep, k) { return rep === 'daily' ? addD(k, -1) : rep === 'weekly' ? addD(k, -7) : rep === 'monthly' ? monthAdd(k, -1) : k; }
const periodName = rep => ({ daily: 'today', weekly: 'this week', monthly: 'this month' }[rep] || '');
function periodLabel(rep, k) {
  if (rep === 'daily') return pd(k).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
  if (rep === 'weekly') return 'Week of ' + pd(k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (rep === 'monthly') return pd(k + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  return '';
}
const listChecks = (l, k) => (l.checks && l.checks[k]) || [];
function newList(areaId, kind = 'list') {
  const l = { id: uid(), name: '', areaId, kind, htype: kind === 'habit' ? 'yn' : undefined, unit: '', repeat: kind === 'habit' ? 'daily' : '', items: [], checks: {}, vals: {}, createdAt: new Date().toISOString(), updatedAt: now(), deleted: false };
  db.lists[l.id] = l; save(); return l;
}
function updList(l, ch) { Object.assign(l, ch, { updatedAt: now() }); save(); }
function listCardHTML(l) {
  const k = periodKey(l.repeat), on = new Set(listChecks(l, k)), n = l.items.length;
  const done = l.items.filter(i => on.has(i.id)).length;
  const pct = n ? Math.round(done / n * 100) : 0;
  /* the last 7 periods, oldest first, for each item */
  const hist = []; let hk = k; for (let i = 0; i < 7; i++) { hist.unshift(hk); hk = prevPeriod(l.repeat, hk); }
  const dots = it => l.repeat ? `<span class="lhist" aria-hidden="true">${hist.map(h => `<i class="${listChecks(l, h).includes(it.id) ? 'on' : ''} ${h === k ? 'now' : ''}" title="${esc(periodLabel(l.repeat, h))}"></i>`).join('')}</span>` : '';
  const items = l.items.map(it => `<div class="litem ${on.has(it.id) ? 'isdone' : ''}"><button class="chk ${on.has(it.id) ? 'done' : ''}" data-act="list-tick" data-id="${esc(l.id)}" data-item="${esc(it.id)}" aria-label="${on.has(it.id) ? 'Untick' : 'Tick'} ${esc(it.title)}" aria-pressed="${on.has(it.id)}">${on.has(it.id) ? I.check : ''}</button><span class="lt" dir="auto">${esc(it.title)}</span>${dots(it)}</div>`).join('');
  /* how full each past period was */
  const trend = l.repeat && n ? `<div class="ltrend" aria-label="Last periods">${hist.map(h => { const c = l.items.filter(i => listChecks(l, h).includes(i.id)).length; return `<span title="${esc(periodLabel(l.repeat, h))}: ${c}/${n}"><i style="height:${Math.max(8, Math.round(c / n * 100))}%" class="${c ? '' : 'zero'}"></i></span>`; }).join('')}</div>` : '';
  return `<div class="card lcard">
    <div class="lh"><button class="lname" data-act="list-edit" data-id="${esc(l.id)}" dir="auto">${esc(l.name || 'Untitled list')}</button>
      <span class="lmeta">${l.repeat ? `${I.rep}${esc(REPS.find(r => r[0] === l.repeat)[1])} · ` : ''}${done}/${n}${l.repeat ? ' ' + periodName(l.repeat) : ''}</span>
      <button class="ib" data-act="list-edit" data-id="${esc(l.id)}" aria-label="Edit list">${I.gear}</button></div>
    <div class="prog" style="margin:10px 0 6px;height:4px"><i style="width:${pct}%"></i></div>
    ${items || '<div class="empty" style="padding:6px 0 2px">No items yet.</div>'}
    ${addForm('list-item', 'Add an item', { id: 'li-' + l.id, data: `data-lid="${esc(l.id)}"` })}
    ${trend}
  </div>`;
}
function listsHTML(areaId) {
  const ls = lists(areaId, 'list');
  return sec('To-do lists', `<div class="plist">${ls.map(listCardHTML).join('')}</div>
    ${ls.length ? '' : '<p class="mut" style="font-size:12px;margin:0 2px">A checklist. Make it repeat daily, weekly or monthly to track habits, spending or anything that comes round again.</p>'}
    <button class="dash" style="width:100%;margin-top:10px" data-act="new-list" data-area="${areaId}">+ New to-do list</button>`, { right: `<span class="mut">${ls.length}</span>` });
}
function listSheet(l) {
  if (l.kind === 'habit') return habitSheet(l);
  return `
  <div class="sheet-top"><button class="ib" data-act="close-sheet" aria-label="Close">${I.l}</button><span class="crumb">${l.kind === 'habit' ? 'Habit tracker' : 'To-do list'}</span><button class="ib" data-act="list-del" data-id="${esc(l.id)}" aria-label="Delete list">${I.trash}</button></div>
  <textarea id="l-name" class="title-in" rows="1" dir="auto" placeholder="${l.kind === 'habit' ? 'Tracker name, e.g. صحتي' : 'List name, e.g. عادات يومية'}">${esc(l.name || '')}</textarea>
  ${sec('Repeats', `<div class="seg" role="group" aria-label="Repeats">${REPS.filter(r => l.kind !== 'habit' || r[0]).map(([v, n]) => `<button class="${(l.repeat || '') === v ? 'on' : ''}" data-act="list-rep" data-id="${esc(l.id)}" data-v="${v}" aria-pressed="${(l.repeat || '') === v}">${n}</button>`).join('')}</div>
    <p class="mut" style="font-size:12px;margin:8px 2px 0;line-height:1.55">${l.repeat ? `Ticks start fresh ${({ daily: 'every day', weekly: 'every Sunday', monthly: 'on the 1st of each month' })[l.repeat]}. Past ${({ daily: 'days', weekly: 'weeks', monthly: 'months' })[l.repeat]} are kept as your history.` : 'A one-off checklist: ticks stay until you untick them.'}</p>`)}
  ${l.kind === 'habit' ? '<p class="mut" style="font-size:12px;margin:14px 2px 0;line-height:1.55">Each item is either a tick (did it or not) or a number you type in, like weight, steps or money. Tap ✓ / 123 to switch.</p>' : ''}
  ${sec('Items', `${l.items.map((it, i) => `<div class="litem"><span class="lt" dir="auto">${esc(it.title)}</span>${l.kind === 'habit' ? `${it.type === 'num' ? `<input class="hunit" id="hu-${esc(it.id)}" data-lid="${esc(l.id)}" data-item="${esc(it.id)}" dir="auto" placeholder="unit" value="${esc(it.unit || '')}" aria-label="Unit for ${esc(it.title)}">` : ''}<button class="htype" data-act="habit-type" data-id="${esc(l.id)}" data-item="${esc(it.id)}" aria-label="Switch between tick and number">${it.type === 'num' ? '123' : '✓'}</button>` : ''}<button class="ib" data-act="list-up" data-id="${esc(l.id)}" data-i="${i}" aria-label="Move up" ${i ? '' : 'disabled style="opacity:.3"'}>${I.l}</button><button class="ib" data-act="list-item-del" data-id="${esc(l.id)}" data-item="${esc(it.id)}" aria-label="Remove ${esc(it.title)}">${I.x}</button></div>`).join('') || '<div class="empty" style="padding:6px 0">No items yet.</div>'}
    ${addForm('list-item', l.kind === 'habit' ? 'Add something to track, e.g. الوزن' : 'Add an item', { id: 'ls-new', data: `data-lid="${esc(l.id)}"` })}`)}`;
}
/* ---------------- habit trackers ----------------
   One habit per tracker, shown as a month calendar. Two kinds:
   'yn'  – did it (green ✓) or didn't (red ✗), tap a day to cycle ✓ → ✗ → empty
   'num' – a number you type in for the day, like weight */
const hv = (l, d) => (l.vals || {})[d];
const fmtNum = v => (Math.round(v * 100) / 100).toLocaleString('en-GB', { maximumFractionDigits: 2 });
function sparkSVG(pts, w = 120, h = 30) {
  if (pts.length < 2) return '';
  const mn = Math.min(...pts), mx = Math.max(...pts), sp = mx - mn || 1;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * (w - 4) + 2, h - 3 - ((v - mn) / sp) * (h - 6)]);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline fill="none" stroke="var(--sand)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${xy.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')}"/><circle cx="${xy[xy.length - 1][0].toFixed(1)}" cy="${xy[xy.length - 1][1].toFixed(1)}" r="3" fill="var(--sand2)"/></svg>`;
}
/* trackers made with the first version (several items in one tracker) become one tracker per item */
function migrateHabits() {
  let ch = false;
  Object.values(db.lists || {}).forEach(l => {
    if (l.kind !== 'habit' || l.deleted || l.htype) return;
    const items = l.items || [];
    if (!items.length) { Object.assign(l, { htype: 'yn', vals: {}, updatedAt: now() }); ch = true; return; }
    items.forEach(it => {
      const vals = {};
      Object.entries(l.vals || {}).forEach(([k, v]) => { if (v && v[it.id] !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(k)) vals[k] = it.type === 'num' ? v[it.id] : !!v[it.id]; });
      const id = uid();
      db.lists[id] = { id, name: it.title, areaId: l.areaId, kind: 'habit', htype: it.type === 'num' ? 'num' : 'yn', unit: it.unit || '', vals, items: [], checks: {}, createdAt: l.createdAt, updatedAt: now(), deleted: false };
    });
    Object.assign(l, { deleted: true, updatedAt: now() }); ch = true;
  });
  if (ch) save();
}
function hStreak(l) {
  let d = today(); if (hv(l, d) !== true) d = addD(d, -1);
  let c = 0; while (hv(l, d) === true && c < 3000) { c++; d = addD(d, -1); }
  return c;
}
function hMonth(l, m) {
  const td = today(); let yes = 0, no = 0, days = 0; const nums = [];
  for (let d = m + '-01'; d.slice(0, 7) === m && d <= td; d = addD(d, 1)) {
    days++; const v = hv(l, d);
    if (v === true) yes++; else if (v === false) no++; else if (typeof v === 'number') nums.push(v);
  }
  return { yes, no, days, nums };
}
function hLast(l) {
  const ks = Object.keys(l.vals || {}).filter(k => typeof l.vals[k] === 'number' && k <= today()).sort();
  return ks.length ? { d: ks[ks.length - 1], v: l.vals[ks[ks.length - 1]], prev: ks.length > 1 ? l.vals[ks[ks.length - 2]] : null } : null;
}
function habitCardHTML(l) {
  const td = today(), m = (ui.hMonth && ui.hMonth[l.id]) || td.slice(0, 7);
  const first = pd(m + '-01'), lead = first.getDay();
  const dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const total = Math.ceil((lead + dim) / 7) * 7, start = addD(m + '-01', -lead);
  const isNum = l.htype === 'num';
  const sel = (ui.hSel && ui.hSel[l.id]) || td;
  let cells = '';
  for (let i = 0; i < total; i++) {
    const d = addD(start, i), out = d.slice(0, 7) !== m, fut = d > td, v = hv(l, d);
    const mark = isNum ? (typeof v === 'number' ? `<b>${fmtNum(v)}</b>` : '') : v === true ? `<i class="hy">${I.check}</i>` : v === false ? `<i class="hn">${I.x}</i>` : '';
    const cls = [out ? 'out' : '', d === td ? 'today' : '', isNum && d === sel ? 'sel' : '', v === true ? 'yes' : v === false ? 'no' : typeof v === 'number' ? 'val' : ''].join(' ');
    cells += `<button class="hc ${cls}" data-act="hcell" data-id="${esc(l.id)}" data-d="${d}" ${fut || out ? 'disabled' : ''} aria-label="${esc(fmtDay(d))}${v === true ? ', done' : v === false ? ', not done' : typeof v === 'number' ? ', ' + fmtNum(v) : ''}"><span class="dn">${pd(d).getDate()}</span>${mark}</button>`;
  }
  const st = hMonth(l, m);
  let meta, foot = '';
  if (isNum) {
    const last = hLast(l);
    meta = last ? `<b>${fmtNum(last.v)}</b>${esc(l.unit ? ' ' + l.unit : '')}${last.prev !== null ? ` <em class="${last.v > last.prev ? 'up' : last.v < last.prev ? 'down' : ''}">${last.v > last.prev ? '+' : ''}${fmtNum(last.v - last.prev)}</em>` : ''}` : '<span class="mut">no entries yet</span>';
    const sv = hv(l, sel);
    foot = `<div class="hedit"><span class="hd">${sel === td ? 'Today' : esc(fmtDay(sel))}</span><input class="hnum" id="hn-${esc(l.id)}" data-lid="${esc(l.id)}" data-k="${sel}" inputmode="decimal" enterkeyhint="done" value="${typeof sv === 'number' ? String(Math.round(sv * 100) / 100) : ''}" placeholder="${hLast(l) ? fmtNum(hLast(l).v) : '0'}" aria-label="${esc(l.name || 'Value')} for ${esc(fmtDay(sel))}"><span class="hu">${esc(l.unit || '')}</span>${typeof sv === 'number' ? `<button class="pill" data-act="hclear" data-id="${esc(l.id)}" data-d="${sel}">Clear</button>` : ''}</div>`;
    if (st.nums.length) {
      const avg = st.nums.reduce((a, b) => a + b, 0) / st.nums.length;
      foot += `<div class="htrend">${sparkSVG(st.nums, 130, 32)}<span class="hv"><small>this month</small><span>avg <b>${fmtNum(avg)}</b></span><small>${fmtNum(Math.min(...st.nums))} – ${fmtNum(Math.max(...st.nums))}</small></span></div>`;
    }
  } else {
    const s = hStreak(l);
    meta = `<span class="cy">✓ ${st.yes}</span><span class="cn">✗ ${st.no}</span>${s ? `<span class="cs">${s} ${s === 1 ? 'day' : 'days'} in a row</span>` : ''}`;
  }
  const mName = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return `<div class="card hcard ${isNum ? 'hk-num' : 'hk-yn'}">
    <div class="lh"><button class="lname" data-act="list-edit" data-id="${esc(l.id)}" dir="auto">${esc(l.name || 'Untitled habit')}</button><button class="ib" data-act="list-edit" data-id="${esc(l.id)}" aria-label="Edit habit">${I.gear}</button></div>
    <div class="hmeta">${meta}</div>
    <div class="hnav"><button class="ib" data-act="hmonth" data-id="${esc(l.id)}" data-dir="-1" aria-label="Previous month">${I.l}</button><span>${esc(mName)}</span><button class="ib" data-act="hmonth" data-id="${esc(l.id)}" data-dir="1" aria-label="Next month" ${m >= td.slice(0, 7) ? 'disabled style="opacity:.3"' : ''}>${I.r}</button></div>
    <div class="hwd">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(w => `<span>${w}</span>`).join('')}</div>
    <div class="hgrid">${cells}</div>
    ${isNum ? foot : '<p class="hhint">Tap a day: ✓ done · tap again: ✗ not done · again to clear</p>'}
  </div>`;
}
/* achievement cards for the section: habits and repeating tasks */
function personalStatsHTML(aid) {
  const td = today(), m = td.slice(0, 7);
  const hs = lists(aid, 'habit');
  const hDone = hs.filter(l => l.htype === 'num' ? typeof hv(l, td) === 'number' : hv(l, td) === true).length;
  const reps = tasks().filter(t => t.repeat && taskArea(t) === aid);
  const repLogs = Object.values(db.log).filter(l => l.type === 'done' && l.repeat && (db.tasks[l.taskId] ? taskArea(db.tasks[l.taskId]) === aid : l.areaId === aid));
  const repToday = repLogs.filter(l => isoDay(l.at) === td).length;
  const repLeft = reps.filter(t => !t.done && t.due && t.due <= td).length;
  const goal = hs.length + repToday + repLeft, got = hDone + repToday;
  const yn = hs.filter(l => l.htype !== 'num');
  let yes = 0, days = 0; yn.forEach(l => { const s = hMonth(l, m); yes += s.yes; days += s.days; });
  const best = yn.map(l => [l, hStreak(l)]).sort((a, b) => b[1] - a[1])[0];
  const repMonth = repLogs.filter(l => isoDay(l.at).slice(0, 7) === m);
  const onTime = repMonth.filter(l => !(l.late > 0)).length;
  const card = (k, v, sub, cls) => `<div class="card hst ${cls}"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${sub}</span></div>`;
  return `<section class="sec"><div class="sec-h"><h2>Progress</h2></div><div class="hstats">
    <div class="card hring">
      <div class="rwrap">${ringSVG(goal ? got / goal : 0)}<div class="rnum"><b>${got}</b><span>${goal ? 'of ' + goal : 'today'}</span></div></div>
      <div class="rinfo"><span class="k">Today</span><span class="s">${goal ? `${hDone}/${hs.length} habits · ${repToday}/${repToday + repLeft} repeating tasks` : 'Add a habit or a repeating task to see your progress here'}</span></div>
    </div>
    ${card('Habits this month', days ? Math.round(yes / days * 100) + '%' : '—', yn.length ? `${yes} ✓ in ${days} habit-days` : 'no ✓/✗ habits yet', 'c-done')}
    ${card('Best streak', best && best[1] ? best[1] : '—', best && best[1] ? `<span dir="auto">${esc(best[0].name || 'Habit')}</span> · days` : 'tick a habit today to start one', 'c-open')}
    ${card('Repeating tasks', repMonth.length, repMonth.length ? `done this month · ${Math.round(onTime / repMonth.length * 100)}% on time` : 'done this month', repMonth.length && onTime < repMonth.length ? 'c-late' : 'c-ok')}
  </div></section>`;
}
function habitsHTML(areaId) {
  migrateHabits();
  const ls = lists(areaId, 'habit');
  return sec('Habit trackers', `<div class="hlist">${ls.map(habitCardHTML).join('')}</div>
    ${ls.length ? '' : '<p class="mut" style="font-size:12px;margin:0 2px">Each habit gets its own calendar: green ✓ or red ✗ for things you did or didn’t do, or a number you type in, like your weight.</p>'}
    <button class="dash" style="width:100%;margin-top:10px" data-act="new-list" data-area="${areaId}" data-kind="habit">+ New habit tracker</button>`, { right: `<span class="mut">${ls.length}</span>` });
}
function habitSheet(l) {
  const n = Object.keys(l.vals || {}).length;
  return `
  <div class="sheet-top"><button class="ib" data-act="close-sheet" aria-label="Close">${I.l}</button><span class="crumb">Habit tracker</span><button class="ib" data-act="list-del" data-id="${esc(l.id)}" aria-label="Delete habit">${I.trash}</button></div>
  <textarea id="l-name" class="title-in" rows="1" dir="auto" placeholder="Habit, e.g. الوزن or رياضة">${esc(l.name || '')}</textarea>
  ${sec('Type', `<div class="htypes">
    <button class="htypeb ${l.htype !== 'num' ? 'on' : ''}" data-act="htype" data-id="${esc(l.id)}" data-v="yn"><span class="ic"><i class="hy">${I.check}</i><i class="hn">${I.x}</i></span><b>Did it / didn’t</b><small>Green ✓ or red ✗ on each day</small></button>
    <button class="htypeb ${l.htype === 'num' ? 'on' : ''}" data-act="htype" data-id="${esc(l.id)}" data-v="num"><span class="ic num">123</span><b>Number</b><small>Type a value each day, like weight</small></button>
  </div>
  ${l.htype === 'num' ? `<div class="card" style="margin-top:10px"><div class="field"><label for="h-unit">Unit</label><input id="h-unit" class="tin" data-lid="${esc(l.id)}" dir="auto" placeholder="kg, steps, OMR…" value="${esc(l.unit || '')}" style="max-width:160px;text-align:end"></div></div>` : ''}
  ${n ? `<p class="mut" style="font-size:12px;margin:10px 2px 0">${n} ${n === 1 ? 'day' : 'days'} recorded. Switching the type keeps them.</p>` : ''}`)}`;
}
/* ---------------- rich notes ----------------
   Notes keep a small HTML subset: <h1>, <h2>, <p> blocks with <b> (bold) and <span class="l"> (light) inside.
   The tablet's native editor reads and writes exactly the same subset (RichText.kt). n.text stays as plain text. */
const NOTE_COLORS = [['#0E0F13', 'Black'], ['#1D202C', 'Navy'], ['#18222F', 'Ink'], ['#1A2621', 'Forest'], ['#251E2C', 'Plum'], ['#2A221E', 'Cocoa'], ['#23262C', 'Slate'], ['#29261E', 'Olive']];
const noteColor = n => (n && n.color) || NOTE_COLORS[0][0];
function richParse(html) {
  const t = document.createElement('template'); t.innerHTML = html || '';
  const blocks = []; let cur = null;
  const open = tag => { cur = { tag, segs: [] }; blocks.push(cur); };
  const walk = (node, f) => {
    node.childNodes.forEach(ch => {
      if (ch.nodeType === 3) { if (!cur) open('p'); if (ch.nodeValue) cur.segs.push({ t: ch.nodeValue.replace(/ /g, ' '), b: f.b, l: f.l }); return; }
      if (ch.nodeType !== 1) return;
      const tag = ch.tagName.toLowerCase();
      if (tag === 'br') { if (ch.nextSibling) open('p'); else if (!cur) open('p'); return; }
      if (/^(h1|h2|h3|p|div|li|blockquote)$/.test(tag)) { open(tag === 'h1' ? 'h1' : tag === 'h2' || tag === 'h3' ? 'h2' : 'p'); walk(ch, f); cur = null; return; }
      const fw = ch.style && ch.style.fontWeight;
      const nf = { b: f.b || tag === 'b' || tag === 'strong' || fw === 'bold' || +fw >= 600, l: f.l || (ch.classList && ch.classList.contains('l')) || (+fw && +fw <= 300) };
      if (nf.b && nf.l) nf.l = false;
      walk(ch, nf);
    });
  };
  walk(t.content, { b: false, l: false });
  return blocks;
}
function richOut(blocks) {
  const html = blocks.map(bl => {
    const merged = [];
    bl.segs.forEach(s => { const last = merged[merged.length - 1]; if (last && last.b === s.b && last.l === s.l) last.t += s.t; else merged.push({ ...s }); });
    return `<${bl.tag}>${merged.map(s => s.b ? `<b>${esc(s.t)}</b>` : s.l ? `<span class="l">${esc(s.t)}</span>` : esc(s.t)).join('')}</${bl.tag}>`;
  }).join('');
  const text = blocks.map(bl => bl.segs.map(s => s.t).join('')).join('\n');
  return { html, text };
}
const textToHtml = txt => String(txt || '').split('\n').map(l => `<p>${esc(l)}</p>`).join('');
/* what goes into the editor: clean subset, with a <br> in empty blocks so the caret can sit there */
function richForEditor(n) {
  const h = richOut(richParse(n.html ? n.html : textToHtml(n.text))).html || '<p></p>';
  return h.replace(/<(p|h1|h2)><\/\1>/g, '<$1><br></$1>');
}
function richSave() {
  const ed = $('#n-rich'); const n = ui.sheet && db.notes[ui.sheet.id]; if (!ed || !n) return;
  const r = richOut(richParse(ed.innerHTML));
  n.html = r.html; n.text = r.text.replace(/\n+$/, ''); n.updatedAt = now();
  clearTimeout(typeT); typeT = setTimeout(save, 500);
  const m = document.getElementById('n-meta'); if (m) m.textContent = noteMeta(n);
}
function richEnsureBlock() {
  const ed = $('#n-rich'); if (!ed) return;
  if (!ed.firstChild) { ed.innerHTML = '<p><br></p>'; return; }
  /* loose text typed straight into the editor goes into a paragraph */
  [...ed.childNodes].forEach(ch => { if (ch.nodeType === 3 || (ch.nodeType === 1 && !/^(P|H1|H2|DIV)$/.test(ch.tagName))) { const p = document.createElement('p'); ch.replaceWith(p); p.appendChild(ch); } });
}
function richBlocksIn(r) {
  const ed = $('#n-rich');
  return [...ed.children].filter(b => r.intersectsNode(b));
}
function richWeight(w) {
  const ed = $('#n-rich'); const sel = getSelection(); if (!ed || !sel.rangeCount) return;
  let r = sel.getRangeAt(0); if (!ed.contains(r.commonAncestorContainer)) return;
  if (r.collapsed && sel.modify) { sel.modify('move', 'backward', 'word'); sel.modify('extend', 'forward', 'word'); r = sel.getRangeAt(0); }
  if (r.collapsed) return;
  const wrapped = [];
  richBlocksIn(r).forEach(bl => {
    const sub = document.createRange(); sub.selectNodeContents(bl);
    if (bl.contains(r.startContainer) || bl === r.startContainer) sub.setStart(r.startContainer, r.startOffset);
    if (bl.contains(r.endContainer) || bl === r.endContainer) sub.setEnd(r.endContainer, r.endOffset);
    if (sub.collapsed) return;
    const frag = sub.extractContents();
    frag.querySelectorAll('b,strong,span').forEach(x => x.replaceWith(...x.childNodes));
    let node;
    if (w === 'bold') { node = document.createElement('b'); node.appendChild(frag); }
    else if (w === 'light') { node = document.createElement('span'); node.className = 'l'; node.appendChild(frag); }
    else { node = document.createElement('span'); node.dataset.tmp = '1'; node.appendChild(frag); }
    sub.insertNode(node);
    /* step out of any bold / light span the selection sat inside */
    let a;
    while ((a = node.parentElement) && a !== bl && /^(B|STRONG|SPAN)$/.test(a.tagName)) {
      const tail = document.createRange(); tail.setStartAfter(node); tail.setEnd(a, a.childNodes.length);
      const rest = tail.extractContents();
      a.after(node);
      if (rest.textContent) { const a2 = a.cloneNode(false); a2.appendChild(rest); node.after(a2); }
      if (!a.textContent) a.remove();
    }
    wrapped.push(node);
  });
  if (!wrapped.length) return;
  const nr = document.createRange(); nr.setStartBefore(wrapped[0]); nr.setEndAfter(wrapped[wrapped.length - 1]);
  sel.removeAllRanges(); sel.addRange(nr);
  richSave();
}
function richBlock(tag) {
  const ed = $('#n-rich'); if (!ed) return;
  ed.focus();
  document.execCommand('formatBlock', false, tag);
  richEnsureBlock(); richSave(); richToolsState();
}
function richToolsState() {
  const tb = $('#ntools'); const sel = getSelection(); if (!tb || !sel.rangeCount) return;
  let n = sel.anchorNode; if (n && n.nodeType === 3) n = n.parentElement;
  const ed = $('#n-rich'); if (!ed || !n || !ed.contains(n)) return;
  const blk = n.closest('h1,h2') ? n.closest('h1,h2').tagName.toLowerCase() : 'p';
  const w = n.closest('b,strong') ? 'bold' : n.closest('span.l') ? 'light' : 'regular';
  tb.querySelectorAll('[data-fmt]').forEach(b => b.classList.toggle('on', b.dataset.fmt === blk || b.dataset.fmt === w));
}
document.addEventListener('selectionchange', () => { if ($('#n-rich')) richToolsState(); });
/* keep the text selected when a format button is pressed */
document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('#ntools [data-fmt]')) e.preventDefault(); });
document.addEventListener('paste', e => {
  if (!e.target.closest || !e.target.closest('#n-rich')) return;
  e.preventDefault();
  const t = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, t);
});
function noteToolsHTML(n) {
  const c = noteColor(n);
  return `<div class="ntools" id="ntools" role="toolbar" aria-label="Formatting">
    <div class="ng"><button data-act="nfmt" data-fmt="h1" aria-label="Heading 1">H1</button><button data-act="nfmt" data-fmt="h2" aria-label="Heading 2">H2</button><button data-act="nfmt" data-fmt="p" aria-label="Body text">Text</button></div>
    <div class="ng"><button data-act="nfmt" data-fmt="bold" aria-label="Bold"><b>B</b></button><button data-act="nfmt" data-fmt="regular" aria-label="Regular">Aa</button><button data-act="nfmt" data-fmt="light" aria-label="Light"><span style="font-weight:300">Aa</span></button></div>
    <button class="ncol" data-act="ncolors" aria-label="Page colour" aria-expanded="${!!ui.nColors}"><i style="background:${c}"></i></button>
  </div>
  ${ui.nColors ? `<div class="nswatch" role="group" aria-label="Page colour">${NOTE_COLORS.map(([v, nm]) => `<button data-act="ncolor" data-v="${v}" aria-label="${nm}" aria-pressed="${c === v}" class="${c === v ? 'on' : ''}"><i style="background:${v}"></i><span>${nm}</span></button>`).join('')}</div>` : ''}`;
}


/* ---------------- views ---------------- */
function homeView() {
  const m = ui.month; const first = pd(m + '-01');
  const { start, end } = gridRange(m);
  const evs = (evCache[m] || unionEvents()).filter(e => !(db.prefs.hiddenCals || []).includes(e.calId));
  const idx = buildIndex(start, end, evs);
  const td = today();
  let cells = '';
  for (let d = start; d <= end; d = addD(d, 1)) {
    const it = idx[d] || { ev: [], tk: [] };
    const out = d.slice(0, 7) !== m;
    const kinds = new Set();
    if (it.ev.length) kinds.add('ev');
    it.tk.forEach(x => { if (x.log || x.t.done) return; kinds.add(isUrgent(x.t) && !x.ghost ? 'urgent' : 'task'); });
    const dots = [...kinds].map(k => `<i class="k-${k}"></i>`).join('');
    const items = [
      ...it.ev.map(e => `<span class="c-ev" dir="auto">${e.allDay ? '' : hm(e.start) + ' '}${esc(e.title)}</span>`),
      ...it.tk.map(x => `<span class="${x.log || x.t.done ? 'c-done' : isUrgent(x.t) && !x.ghost ? 'c-urgent' : 'c-task'}" dir="auto">${esc(x.t.title)}</span>`)
    ];
    const chips = items.slice(0, 3).join('') + (items.length > 3 ? `<span class="more">+${items.length - 3} more</span>` : '');
    const n = it.ev.length + it.tk.length;
    cells += `<button class="cell ${out ? 'out' : ''} ${d === td ? 'today' : ''} ${d === ui.sel ? 'sel' : ''}" data-act="pick" data-d="${d}" aria-label="${esc(fmtDay(d))}${n ? ', ' + n + ' items' : ''}"><span class="n">${pd(d).getDate()}</span><span class="dots">${dots}</span><span class="chips">${chips}</span></button>`;
  }
  const sel = idx[ui.sel] || { ev: [], tk: [] };
  const selList = sel.ev.map(evHTML).join('') + sel.tk.map(x => taskHTML(x.t, { hideDue: true, ghost: x.ghost, log: x.log })).join('');
  const urgent = tasks().filter(isUrgent).sort(byDue);
  const notThisMonth = m !== td.slice(0, 7) || ui.sel !== td;
  return `<div class="hero"><img src="header.png" alt="Ctrl Z Station" decoding="async"></div>${pulseHTML()}<div class="home">
    <div class="left calp">
      <div class="hdr">
        <h1>${first.toLocaleDateString('en-GB', { month: 'long' })} <span>${first.getFullYear()}</span></h1>
        <div class="row">
          ${notThisMonth ? '<button class="pill" data-act="today">Today</button>' : ''}
          <button class="ib" data-act="prev" aria-label="Previous month">${I.l}</button>
          <button class="ib" data-act="next" aria-label="Next month">${I.r}</button>
        </div>
      </div>
      <div class="cal-wd">${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(w => `<span><span class="wd-s">${w[0]}</span><span class="wd-l">${w}</span></span>`).join('')}</div>
      <div class="cal">${cells}</div>
      <div class="legend" style="margin-top:8px"><span><i class="k-ev"></i>Google events</span><span><i class="k-task"></i>Tasks</span><span><i class="k-urgent"></i>Urgent</span></div>
    </div>
    <div class="right">
      <section class="sec">
        <h2 class="day-title">${ui.sel === td ? 'Today · ' : ''}${esc(fmtDay(ui.sel))}</h2>
        ${selList || '<div class="empty">Nothing scheduled</div>'}
        <div class="add-row"><button class="dash" data-act="new-event" data-d="${ui.sel}">+ Event</button><button class="dash" data-act="new-task" data-d="${ui.sel}">+ Task</button></div>
      </section>
    </div>
  </div>
  ${homeStatsHTML()}
  ${homeTasksHTML()}
  <div class="desk note-add">${sec('Quick note', qaHTML('qa-h'))}</div>`;
}
/* review numbers for everything, whatever the Review page is filtered to */
function globalReview(from, to) {
  const sa = ui.rArea, sp = ui.rProj; ui.rArea = ''; ui.rProj = '';
  try { return reviewData(from, to); } finally { ui.rArea = sa; ui.rProj = sp; }
}
function ringSVG(pct, size = 96, w = 10) {
  const r = (size - w) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" class="ring">
    <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#DDBF9F"/><stop offset="1" stop-color="#C29B78"/></linearGradient></defs>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--s2)" stroke-width="${w}"/>
    ${p > 0 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#rg)" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` : ''}
  </svg>`;
}
function homeStatsHTML() {
  const td = today();
  const r = globalReview(addD(td, -6), td);
  const open = tasks().filter(t => !t.done), overdue = open.filter(isOverdue);
  const per = {}; r.done.forEach(l => { const d = isoDay(l.at); per[d] = (per[d] || 0) + 1; });
  const doneToday = per[td] || 0;
  const left = open.filter(t => t.due && t.due <= td).length;
  const goal = doneToday + left;
  const days = []; for (let i = 6; i >= 0; i--) days.push(addD(td, -i));
  const max = Math.max(1, ...days.map(d => per[d] || 0));
  const card = (k, v, sub, cls) => `<button class="card hst ${cls}" data-act="nav" data-v="review"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${sub}</span></button>`;
  return `<section class="sec"><div class="sec-h"><h2>Your tasks</h2><button class="pill" data-act="nav" data-v="review">Review</button></div><div class="hstats">
    <div class="card hring">
      <div class="rwrap">${ringSVG(goal ? doneToday / goal : 0)}<div class="rnum"><b>${doneToday}</b><span>${goal ? 'of ' + goal : 'done'}</span></div></div>
      <div class="rinfo"><span class="k">Done today</span><span class="s">${goal ? (left ? `${left} still to do today` : 'Everything for today is done') : 'Nothing due today'}</span>
        <div class="wk" aria-label="Done per day, last 7 days">${days.map(d => `<span title="${esc(fmtDay(d))}: ${per[d] || 0}"><i style="height:${Math.max(6, Math.round((per[d] || 0) / max * 100))}%" class="${per[d] ? '' : 'z'} ${d === td ? 'now' : ''}"></i><em>${'SMTWTFS'[pd(d).getDay()]}</em></span>`).join('')}</div></div>
    </div>
    ${card('Open', open.length, `${open.filter(t => t.due === td).length} due today`, 'c-open')}
    ${card('Done', r.done.length, 'last 7 days', 'c-done')}
    ${card('Late', overdue.length, r.late.length ? `${r.late.length} done late this week` : 'overdue now', overdue.length ? 'c-late' : 'c-ok')}
  </div></section>`;
}
function homeTasksHTML() {
  if (ui.homeAll) return allTasksHTML();
  const open = tasks().filter(t => !t.done).sort((a, b) => (isUrgent(b) - isUrgent(a)) || byDue(a, b));
  const few = open.slice(0, 5);
  return sec('Tasks', `${few.map(t => taskHTML(t)).join('') || '<div class="empty">All clear.</div>'}
    ${open.length > few.length ? `<button class="dash" style="width:100%;margin-top:8px" data-act="home-all">View more · ${open.length - few.length} more</button>` : ''}`,
    { right: open.length ? `<button class="pill" data-act="home-all">View more</button>` : '' });
}
/* a small at-a-glance strip: every section's open, done (last 14 days) and late tasks */
function pulseHTML() {
  const td = today();
  const sa = ui.rArea, sp = ui.rProj; ui.rArea = ''; ui.rProj = '';
  let by; try { by = reviewData(addD(td, -13), td).by; } finally { ui.rArea = sa; ui.rProj = sp; }
  const rows = AREAS.map(a => [a, by[a.name] || { done: 0, open: 0, overdue: 0 }]);
  if (by['No section'] && (by['No section'].open || by['No section'].done)) rows.push([null, by['No section']]);
  const max = Math.max(1, ...rows.map(([, v]) => v.done + v.open));
  return `<div class="pulse" role="list" aria-label="Sections at a glance">${rows.map(([a, v]) => `<button class="pz" role="listitem" data-act="nav" data-v="${a ? a.id : 'home'}" aria-label="${esc(a ? a.name : 'No section')}: ${v.open} open, ${v.done} done${v.overdue ? ', ' + v.overdue + ' late' : ''}">
    <span class="pn">${a ? adot(a) : ''}${esc(a ? a.name : 'No section')}</span>
    <span class="pc"><b>${v.open}</b> open · ${v.done} done${v.overdue ? ` · <em>${v.overdue} late</em>` : ''}</span>
    <span class="pt"><i style="width:${Math.round((v.done + v.open) / max * 100)}%;${a ? 'background:' + a.color : ''}"></i></span></button>`).join('')}</div>`;
}
function noteTitle(n) {
  if ((n.title || '').trim()) return { t: n.title.trim(), p: (n.text || '').trim() };
  const l = (n.text || '').trim().split('\n'); return { t: l[0] || (hasInk(n) ? 'Handwritten note' : 'Empty note'), p: l.slice(1).join('\n').trim() };
}

/* ---------------- handwriting (written on the tablet's native pen page) ---------------- */
/* Strokes are stored in page units: the page is 1000 units wide on every device.
   drawInk follows exactly the same rules as Ink.kt in the Android app. */
const INK_PAGE = 1000;
const INK_TABLET = (() => { try { return NATIVE && !!ZeroNative.isTablet && !!ZeroNative.openInk && ZeroNative.isTablet(); } catch { return false; } })();
const hasInk = n => !!(n && n.ink && n.ink.s && n.ink.s.length);
const inkCache = new WeakMap();
function inkStrokes(ink) {
  if (!ink || !ink.s) return [];
  let c = inkCache.get(ink); if (c) return c;
  c = ink.s.map(o => {
    const d = o.p || []; const n = Math.floor(d.length / 3); const p = new Float32Array(n * 3);
    let x = 0, y = 0, r = 0, t = Infinity, b = -Infinity, l = Infinity, rt = -Infinity;
    for (let i = 0; i < n; i++) {
      x += d[i * 3]; y += d[i * 3 + 1]; r += d[i * 3 + 2];
      p[i * 3] = x / 2; p[i * 3 + 1] = y / 2; p[i * 3 + 2] = r / 100;
      t = Math.min(t, y / 2); b = Math.max(b, y / 2); l = Math.min(l, x / 2); rt = Math.max(rt, x / 2);
    }
    const w = +o.w || 3, pad = w * 1.3;
    return { t: o.t || 'pen', c: o.c || '#ECE6DE', w, p, n, top: t - pad, bot: b + pad, left: l - pad, right: rt + pad };
  });
  inkCache.set(ink, c); return c;
}
const inkBottom = ink => inkStrokes(ink).reduce((m, s) => Math.max(m, s.bot), 0);
const penW = (w, p) => w * (0.4 + 0.8 * Math.pow(Math.min(1, Math.max(0, p)), 0.9));
function drawInk(ctx, list, s, top = -Infinity, bottom = Infinity) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const pass of [0, 1]) for (const st of list) {
    if ((st.t === 'hl') !== (pass === 0)) continue;
    if (st.bot * s < top || st.top * s > bottom) continue;
    const p = st.p, n = st.n; if (!n) continue;
    ctx.globalAlpha = st.t === 'hl' ? 0.38 : st.t === 'pencil' ? 0.82 : 1;
    ctx.strokeStyle = ctx.fillStyle = st.c;
    const dot = r => { ctx.beginPath(); ctx.arc(p[0] * s, p[1] * s, Math.max(r, 0.3), 0, Math.PI * 2); ctx.fill(); };
    if (st.t === 'pen') {
      if (n === 1) { dot(penW(st.w, p[2]) * s / 2); continue; }
      const buckets = new Map();
      for (let i = 1; i < n; i++) {
        const k = Math.max(1, Math.round(penW(st.w, (p[i * 3 - 1] + p[i * 3 + 2]) / 2) * 4));
        let a = buckets.get(k); if (!a) buckets.set(k, a = []); a.push(i);
      }
      for (const [k, a] of buckets) {
        ctx.lineWidth = k / 4 * s; ctx.beginPath();
        for (const i of a) { ctx.moveTo(p[i * 3 - 3] * s, p[i * 3 - 2] * s); ctx.lineTo(p[i * 3] * s, p[i * 3 + 1] * s); }
        ctx.stroke();
      }
      continue;
    }
    const w = st.t === 'pencil' ? st.w * 0.9 : st.w;
    if (n === 1) { dot(w * s / 2); continue; }
    ctx.lineWidth = w * s; ctx.beginPath(); ctx.moveTo(p[0] * s, p[1] * s);
    if (n === 2) ctx.lineTo(p[3] * s, p[4] * s);
    else {
      for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(p[i * 3] * s, p[i * 3 + 1] * s, (p[i * 3] + p[i * 3 + 3]) / 2 * s, (p[i * 3 + 1] + p[i * 3 + 4]) / 2 * s);
      ctx.lineTo(p[(n - 1) * 3] * s, p[(n - 1) * 3 + 1] * s);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
/* small previews on the note cards: the handwriting, cropped to where it is */
function drawThumbs() {
  document.querySelectorAll('canvas.nthumb').forEach(cv => {
    const n = db.notes[cv.dataset.ink]; if (!hasInk(n)) return;
    const list = inkStrokes(n.ink);
    const w = cv.clientWidth, h = cv.clientHeight, dpr = window.devicePixelRatio || 1; if (!w || !h) return;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const x0 = Math.min(...list.map(s => s.left)), x1 = Math.max(...list.map(s => s.right)), y0 = Math.min(...list.map(s => s.top));
    const s = Math.min((w - 16) / Math.max(40, x1 - x0), 0.75);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, (8 - x0 * s) * dpr, (8 - y0 * s) * dpr);
    drawInk(ctx, list, s, y0 * s - 10, y0 * s + h);
  });
}
/* notes the tablet's pen page saved come back through the Android app */
window.__zeroInkPull = () => {
  if (!NATIVE || !window.ZeroNative || !ZeroNative.takeInk) return false;
  let arr; try { arr = JSON.parse(ZeroNative.takeInk() || '[]'); } catch { return false; }
  if (!arr.length) return false;
  let changed = false;
  for (const x of arr) {
    if (!x || !x.id) continue;
    const cur = db.notes[x.id];
    if (cur && (x.updatedAt || 0) < (cur.updatedAt || 0)) continue;
    if (x.deleted) { if (cur && !cur.deleted) { cur.deleted = true; cur.updatedAt = x.updatedAt; changed = true; } continue; }
    db.notes[x.id] = { ...(cur || { id: x.id, createdAt: x.createdAt || new Date().toISOString() }), title: x.title || '', text: x.text || '', html: x.html || null, color: x.color || null, ink: x.ink || null, updatedAt: x.updatedAt, deleted: false };
    changed = true;
  }
  if (changed) { save(); renderMain(); if (ui.sheet && ui.sheet.type === 'note') renderSheet(); }
  for (const x of arr) if (x && x.id) { try { ZeroNative.ackInk(x.id, String(x.updatedAt || 0)); } catch { } }
  return changed;
};
function inkSheet(n) {
  const zoom = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M8.5 11h5${ui.inkZoom ? '' : 'M11 8.5v5'}"/></svg>`;
  return `<div class="writer inkw" role="dialog" aria-label="Note">
    <div class="bar"><button class="ib" data-act="close-sheet" aria-label="Back">${I.l}</button><span class="meta" id="n-meta">${noteMeta(n)} · handwriting</span><span style="display:flex;gap:4px"><button class="ib" data-act="ink-zoom" aria-label="${ui.inkZoom ? 'Fit to screen' : 'Zoom in'}">${zoom}</button><button class="ib" data-act="del-note" aria-label="Delete note">${I.trash}</button></span></div>
    <div class="body" id="n-body"><div class="page" id="ink-page">
      <textarea id="n-title" class="wt" rows="1" dir="auto" placeholder="Title" aria-label="Title">${esc(n.title || '')}</textarea>
      <div class="rule"></div>
      <textarea id="n-text" class="wb" dir="auto" placeholder="" aria-label="Note">${esc(n.text || '')}</textarea>
      <canvas id="ink-cv" aria-hidden="true"></canvas>
    </div></div></div>`;
}
function layoutInk() {
  const pg = $('#ink-page'), body = $('#n-body'); const n = ui.sheet && db.notes[ui.sheet.id];
  if (!pg || !body || !n) return;
  const avail = body.clientWidth;
  const w = ui.inkZoom ? Math.max(avail, 820) : Math.min(avail, 900);
  pg.style.width = w + 'px'; pg.style.setProperty('--u', (w / INK_PAGE) + 'px');
  growNote();
  const tx = $('#n-text', pg); const textH = tx ? tx.offsetTop + tx.offsetHeight : 0;
  pg.style.minHeight = Math.ceil(Math.max(textH, inkBottom(n.ink) * w / INK_PAGE) + 160) + 'px';
  drawInkView();
}
let inkRaf = 0;
function drawInkView() {
  const cv = $('#ink-cv'), pg = $('#ink-page'), body = $('#n-body'); const n = ui.sheet && db.notes[ui.sheet.id];
  if (!cv || !pg || !body || !n) return;
  const w = pg.clientWidth, vh = body.clientHeight, dpr = window.devicePixelRatio || 1, s = w / INK_PAGE;
  const top = Math.max(0, Math.min(body.scrollTop - pg.offsetTop, pg.offsetHeight - vh));
  cv.style.top = top + 'px'; cv.style.width = w + 'px'; cv.style.height = vh + 'px';
  cv.width = Math.round(w * dpr); cv.height = Math.round(vh * dpr);
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, -top * dpr);
  drawInk(ctx, inkStrokes(n.ink), s, top, top + vh);
}
function bindInk() {
  const body = $('#n-body'); if (!body || !$('#ink-page')) return;
  body.addEventListener('scroll', () => { cancelAnimationFrame(inkRaf); inkRaf = requestAnimationFrame(drawInkView); }, { passive: true });
  layoutInk();
}
window.addEventListener('resize', () => { if ($('#ink-page')) layoutInk(); });
function notesView() {
  const list = notes();
  const q = ui.nq.trim().toLowerCase();
  const shown = q ? list.filter(n => ((n.title || '') + ' ' + (n.text || '')).toLowerCase().includes(q)) : list;
  let html = `<div class="narrow"><div class="hdr"><div><div class="sub">${list.length} ${list.length === 1 ? 'note' : 'notes'}</div><h1>Notes</h1></div><button class="pill" data-act="new-note">+ New note</button></div>`;
  if (list.length > 5) html += `<input id="note-q" class="tin" dir="auto" type="search" placeholder="Search notes" value="${esc(ui.nq)}" style="margin-bottom:12px">`;
  html += `<div class="ngrid">${shown.map((n, i) => {
    const { t, p } = noteTitle(n);
    return `<button class="ncard ${i === 0 && !q && !n.color ? 'first' : ''} ${n.color ? 'tinted' : ''}" data-act="open-note" data-id="${esc(n.id)}" ${n.color ? `style="--npage:${esc(n.color)}"` : ''}><span class="t" dir="auto">${esc(t)}</span>${p ? `<span class="p" dir="auto">${esc(p.slice(0, 280))}</span>` : ''}${hasInk(n) ? `<canvas class="nthumb" data-ink="${esc(n.id)}" aria-hidden="true"></canvas>` : ''}<span class="d">${esc(new Date(n.updatedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</span></button>`;
  }).join('')}</div>`;
  if (!list.length) html += '<div class="empty" style="padding-top:20px">No notes yet. Tap “New note” to start writing.</div>';
  else if (!shown.length) html += '<div class="empty">No notes match.</div>';
  return html + '</div>';
}
function allTasksHTML() {
  const seg = (v, l) => `<button class="${ui.tFilter === v ? 'on' : ''}" data-act="tfilter" data-v="${v}" aria-pressed="${ui.tFilter === v}">${l}</button>`;
  let html = `<section class="sec alltasks"><div class="sec-h"><h2>All tasks · ${tasks().filter(t => !t.done).length}</h2><button class="pill" data-act="home-all">Show less</button></div>
    <div class="seg" role="group" aria-label="Filter" style="margin-bottom:6px">${seg('all', 'By date')}${seg('repeat', 'Repeating')}</div>`;
  if (ui.tFilter === 'repeat') {
    const list = tasks().filter(t => t.repeat).sort(byDue);
    const groups = { daily: [], weekly: [], monthly: [], yearly: [] };
    list.forEach(t => (groups[t.repeat.freq] || groups.monthly).push(t));
    html += `<p class="mut" style="font-size:12px;margin:10px 2px 0">To make a task repeat, write كل يوم / كل أسبوع / كل شهر / كل سنة when you add it.</p>`;
    [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly']].forEach(([k, n]) => {
      if (groups[k].length) html += sec(n, groups[k].map(t => taskHTML(t)).join(''));
    });
    if (!list.length) html += '<div class="empty" style="padding-top:20px">No repeating tasks yet.</div>';
    return html + '</section>';
  }
  const td = today(), tm = addD(td, 1), wk = addD(td, 7);
  const open = tasks().filter(t => !t.done).sort(byDue);
  const groups = [
    ['Overdue', open.filter(t => t.due && t.due < td), 'or'],
    ['Today', open.filter(t => t.due === td)],
    ['Tomorrow', open.filter(t => t.due === tm)],
    ['Next 7 days', open.filter(t => t.due > tm && t.due <= wk)],
    ['Later', open.filter(t => t.due > wk)],
    ['Anytime', open.filter(t => !t.due)]
  ];
  let any = false;
  groups.forEach(([n, list, cls]) => { if (list.length) { any = true; html += sec(n, list.map(t => taskHTML(t, { hideDue: n === 'Today' })).join(''), { cls, right: `<span class="mut">${list.length}</span>` }); } });
  if (!any) html += '<div class="empty" style="padding-top:20px">All clear. Add a task below, or inside a section.</div>';
  const loose = areaProjects(null);
  if (loose.length) html += sec('Projects without a section', `<p class="mut" style="font-size:12px;margin:0 2px 10px">Open one and choose its section so it shows up in the right tab.</p><div class="plist">${loose.map(pcardHTML).join('')}</div>`);
  const since = addD(td, -14);
  const done = tasks().filter(t => t.done && t.doneAt && isoDay(t.doneAt) >= since).sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1));
  if (done.length) html += `<section class="sec"><div class="sec-h"><h2>Completed · last 14 days</h2><button class="pill" data-act="show-done">${ui.showDone ? 'Hide' : 'Show ' + done.length}</button></div>${ui.showDone ? done.map(t => taskHTML(t)).join('') : ''}</section>`;
  return html + '</section>';
}
function areaView(a) {
  const allP = areaProjects(a.id), ps = allP.filter(p => !p.done), psDone = allP.filter(p => p.done);
  const all = tasks().filter(t => taskArea(t) === a.id);
  const loose = all.filter(t => !t.projectId || !db.projects[t.projectId] || db.projects[t.projectId].deleted);
  const open = loose.filter(t => !t.done).sort(byDue);
  const done = loose.filter(t => t.done).sort((x, y) => ((x.doneAt || '') < (y.doneAt || '') ? 1 : -1));
  const openAll = all.filter(t => !t.done);
  const overdue = openAll.filter(isOverdue).length;
  let html = `<div class="narrow">
    <div class="hdr ahdr" style="--ac:${a.color}"><div><div class="sub">${openAll.length} open${overdue ? ` · <span class="or">${overdue} overdue</span>` : ''} · ${ps.length} open ${ps.length === 1 ? 'project' : 'projects'}${psDone.length ? ` · ${psDone.length} completed` : ''}</div><h1 class="area-h">${adot(a)}${esc(a.name)}</h1></div></div>
    ${LIST_AREAS.includes(a.id) ? `<div class="add3"><button class="pill" data-act="focus" data-f="area-new">+ Task</button><button class="pill" data-act="focus" data-f="proj-new">+ Project</button><button class="pill" data-act="new-list" data-area="${a.id}">+ To-do list</button><button class="pill" data-act="new-list" data-area="${a.id}" data-kind="habit">+ Habit tracker</button></div>${personalStatsHTML(a.id)}` : ''}`;
  html += sec('Projects', `<div class="plist">${ps.map(pcardHTML).join('')}</div>
    <div class="card" style="padding:0 6px 0 14px;margin-top:${ps.length ? 10 : 0}px">${addForm('proj', 'New project in ' + a.name, { id: 'proj-new' })}</div>
    ${ps.length || psDone.length ? '' : '<p class="mut" style="font-size:12px;margin:8px 2px 0">A project keeps one goal’s tasks together, split into stages if you like.</p>'}
    ${psDone.length ? `<div class="sec-h" style="margin-top:14px"><h2>Completed projects · ${psDone.length}</h2><button class="pill" data-act="show-donep">${ui.showDoneP ? 'Hide' : 'Show'}</button></div>${ui.showDoneP ? `<div class="plist">${psDone.map(pcardHTML).join('')}</div>` : ''}` : ''}`);
  if (LIST_AREAS.includes(a.id)) html += habitsHTML(a.id) + listsHTML(a.id);
  html += sec('Tasks', `${open.map(t => taskHTML(t, { inArea: true })).join('') || '<div class="empty" style="padding:6px 0 4px">No loose tasks.</div>'}
    ${addForm('area-task', 'Add a task to ' + a.name, { id: 'area-new' })}`, { right: `<span class="mut">${open.length}</span>` });
  if (done.length) html += `<section class="sec"><div class="sec-h"><h2>Completed</h2><button class="pill" data-act="show-done">${ui.showDone ? 'Hide' : 'Show ' + done.length}</button></div>${ui.showDone ? done.slice(0, 40).map(t => taskHTML(t, { inArea: true })).join('') : ''}</section>`;
  return html + '</div>';
}
function projectView(p) {
  const s = projStats(p);
  const ts = tasks().filter(t => t.projectId === p.id);
  const a = areaOf(p.areaId);
  const name = p.name.toLowerCase();
  const linked = unionEvents().filter(e => e.title.toLowerCase().includes(name) && evDays(e).slice(-1)[0] >= today()).slice(0, 5);
  const stageBlock = (st) => {
    const list = sortOpen(ts.filter(t => (st ? t.stageId === st.id : !t.stageId || !(p.stages || []).some(x => x.id === t.stageId))));
    const doneN = list.filter(t => t.done).length;
    const head = st
      ? `<div class="stage-h"><input id="st-${esc(st.id)}" data-stage="${esc(st.id)}" dir="auto" value="${esc(st.name)}" aria-label="Stage name"><span class="mut num" style="font-size:12px;white-space:nowrap">${doneN}/${list.length}</span><input type="date" id="std-${esc(st.id)}" data-stage-due="${esc(st.id)}" value="${esc(st.due || '')}" aria-label="Stage due date" style="background:transparent;border:0;color:var(--mut);font-size:12px;color-scheme:dark;width:118px"><button class="ib" data-act="del-stage" data-sid="${esc(st.id)}" aria-label="Delete stage">${I.x}</button></div>`
      : `<div class="stage-h"><span style="font-size:15px;font-weight:600;padding:4px 0">${(p.stages || []).length ? 'Other' : 'Tasks'}</span><span class="mut num" style="font-size:12px">${doneN}/${list.length}</span></div>`;
    if (!st && !list.length && (p.stages || []).length) return '';
    return `<div class="stage">${head}${list.map(t => taskHTML(t, { inArea: true, inProject: true })).join('')}
      ${addForm('stage', st ? 'Add task to ' + st.name : 'Add task', { id: 'add-' + (st ? st.id : 'none'), data: `data-sid="${st ? esc(st.id) : ''}"` })}</div>`;
  };
  return `<div class="pview">
    <div class="hdr" style="margin-bottom:8px"><button class="pill" data-act="nav" data-v="${a ? a.id : 'home'}" style="display:inline-flex;align-items:center;gap:6px;padding-left:8px">${I.l}${a ? adot(a) + esc(a.name) : 'Home'}</button><button class="ib" data-act="del-project" aria-label="Delete project">${I.trash}</button></div>
    <div class="ptitle"><button class="pchk ${p.done ? 'on' : ''}" data-act="proj-done" aria-pressed="${!!p.done}" aria-label="${p.done ? 'Mark project not done' : 'Mark project done'}">${p.done ? I.check : ''}</button><input id="proj-name" class="title-in" style="font-size:28px" dir="auto" value="${esc(p.name)}" aria-label="Project name"></div>
    ${p.done ? `<div class="pdone-note">${I.check} Completed ${esc(fmtDay(isoDay(p.doneAt || new Date().toISOString())))}</div>` : s.total && s.done === s.total ? `<button class="pdone-cta" data-act="proj-done">All ${s.total} tasks are done. Mark the project as completed</button>` : ''}
    <div style="display:flex;align-items:center;gap:10px;margin:10px 0 12px;flex-wrap:wrap;font-size:13px" class="mut">
      <span>${s.done} of ${s.total} done</span><span>·</span>
      <label style="display:flex;align-items:center;gap:6px">Deadline <input type="date" id="proj-deadline" value="${esc(p.deadline || '')}" style="background:transparent;border:0;color:var(--tx);color-scheme:dark;font-size:13px"></label>
      <span>·</span>
      <label style="display:flex;align-items:center;gap:6px">Section <select id="proj-area" class="mini-sel"><option value="">None</option>${AREAS.map(x => `<option value="${x.id}" ${p.areaId === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
    </div>
    <div class="prog"><i style="width:${s.pct}%"></i></div>
    ${boardHTML(p, ts)}
    ${linked.length ? sec('Linked events', linked.map(evHTML).join('')) : ''}
    <div class="sec-h" style="margin-top:26px"><h2>${(p.stages || []).length ? 'Stages' : 'List'}</h2></div>
    ${(p.stages || []).map(stageBlock).join('')}
    ${stageBlock(null)}
    <div style="margin-top:22px"><button class="dash" style="width:100%" data-act="add-stage">+ Add stage</button></div>
  </div>`;
}

/* ---------------- project board (To do / Doing / Done) ---------------- */
function kcol(t) { return t.done ? 'done' : t.status === 'doing' ? 'doing' : 'todo'; }
function kcardHTML(t, p) {
  const col = kcol(t);
  const st = t.stageId && (p.stages || []).find(x => x.id === t.stageId);
  const bits = [];
  if (st) bits.push(`<span class="kst" dir="auto">${esc(st.name)}</span>`);
  if (t.due && !t.done) bits.push(`<span class="${isOverdue(t) ? 'or' : ''}">${esc(relDay(t.due) + (t.time ? ' ' + t.time : ''))}</span>`);
  if (t.done && t.doneAt) bits.push(esc(shortDay(isoDay(t.doneAt))));
  const subs = (t.subtasks || []).length; if (subs) bits.push(`${(t.subtasks || []).filter(x => x.done).length}/${subs}`);
  const mv = (to, label, cls = '') => `<button class="kmv ${cls}" data-act="kmove" data-id="${esc(t.id)}" data-to="${to}" aria-label="${label}">${label}</button>`;
  const btns = col === 'todo' ? mv('doing', 'Start →')
    : col === 'doing' ? mv('todo', '← To do') + mv('done', 'Done ✓', 'ok')
    : mv('doing', '↺ Reopen');
  return `<div class="kcard ${isUrgent(t) && !t.done ? 'urg' : ''}" draggable="true" data-kid="${esc(t.id)}">
    <button class="kb" data-act="open-task" data-id="${esc(t.id)}"><span class="tt" dir="auto">${esc(t.title || 'Untitled')}</span>${bits.length ? `<span class="km">${bits.join(' · ')}</span>` : ''}</button>
    <div class="kbtns">${btns}</div></div>`;
}
function boardHTML(p, ts) {
  const cols = [['todo', 'To do'], ['doing', 'Doing'], ['done', 'Done']];
  const by = { todo: [], doing: [], done: [] };
  ts.forEach(t => by[kcol(t)].push(t));
  by.todo.sort(byDue); by.doing.sort(byDue);
  by.done.sort((a, b) => ((a.doneAt || '') < (b.doneAt || '') ? 1 : -1));
  return `<div class="kboard" id="kboard">${cols.map(([k, l]) => `<section class="kcol k-${k}" data-kcol="${k}">
      <div class="kh"><span>${l}</span><span class="kn num">${by[k].length}</span></div>
      <div class="klist">${by[k].map(t => kcardHTML(t, p)).join('') || `<div class="kempty">${k === 'done' ? 'Nothing finished yet' : 'Empty'}</div>`}</div>
      ${k !== 'done' ? addForm('board', 'Add card', { id: 'kadd-' + k, cls: 'kadd', data: `data-st="${k}"` }) : ''}
    </section>`).join('')}</div>`;
}
function kmove(t, to) {
  if (!t) return;
  if (to === 'done') { if (!t.done) toggleDone(t); if (!t.repeat) upd(t, { status: 'done' }); return; }
  if (t.done) toggleDone(t);
  upd(t, { status: to });
}

/* ---------------- review ---------------- */
function reviewRange() {
  if (ui.rDays === 0 && ui.rFrom && ui.rTo) return ui.rFrom <= ui.rTo ? [ui.rFrom, ui.rTo] : [ui.rTo, ui.rFrom];
  const n = ui.rDays || 14; const to = today(); return [addD(to, -(n - 1)), to];
}
function ensureReviewEvents(from, to) {
  const key = from + '_' + to;
  if (ui.rKey === key) return;
  ui.rKey = key; ui.rEvents = null;
  if (!authed() || !navigator.onLine) { ui.rEvents = unionEvents().filter(e => evDays(e).some(d => d >= from && d <= to)); return; }
  fetchEvents(from, to).then(ev => { if (ui.rKey === key) { ui.rEvents = ev; if (ui.view === 'review') renderMain(); } })
    .catch(() => { ui.rEvents = unionEvents().filter(e => evDays(e).some(d => d >= from && d <= to)); if (ui.view === 'review') renderMain(); });
}
function reviewScope() {
  const fA = areaOf(ui.rArea) ? ui.rArea : '';
  const p = ui.rProj && db.projects[ui.rProj] && !db.projects[ui.rProj].deleted ? db.projects[ui.rProj] : null;
  const fP = p && (!fA || p.areaId === fA) ? p.id : '';
  const tOk = t => !!t && (!fA || taskArea(t) === fA) && (!fP || t.projectId === fP);
  const lOk = l => { const t = db.tasks[l.taskId]; if (t) return tOk(t); return (!fA || l.areaId === fA) && (!fP || l.projectId === fP); };
  const label = fP ? db.projects[fP].name : fA ? areaOf(fA).name : 'All sections';
  return { fA, fP, tOk, lOk, label };
}
function reviewData(from, to) {
  const sc = reviewScope();
  const inR = iso => { const d = isoDay(iso); return d >= from && d <= to; };
  const logs = Object.values(db.log).filter(l => inR(l.at) && sc.lOk(l)).sort((a, b) => (a.at < b.at ? -1 : 1));
  const undone = new Set(logs.filter(l => l.type === 'undone').map(l => l.taskId));
  const done = logs.filter(l => l.type === 'done' && (l.repeat || !undone.has(l.taskId) || (db.tasks[l.taskId] && db.tasks[l.taskId].done)));
  const created = logs.filter(l => l.type === 'created');
  const postponed = logs.filter(l => l.type === 'postponed');
  const late = done.filter(l => l.late > 0);
  const avgLate = late.length ? (late.reduce((a, l) => a + l.late, 0) / late.length) : 0;
  const scoped = tasks().filter(sc.tOk);
  const open = scoped.filter(t => !t.done).sort(byDue);
  const stillOpen = open.filter(t => t.due && t.due >= from && t.due <= to);
  const overdue = open.filter(isOverdue);
  const plannedDone = done.filter(l => l.due && l.due >= from && l.due <= to).length;
  const planned = plannedDone + stillOpen.length;
  const rep = done.filter(l => l.repeat);
  /* events have no section: tie them to a project (or a section's projects) by name */
  const scopeProjects = sc.fP ? [db.projects[sc.fP]] : sc.fA ? areaProjects(sc.fA) : projects();
  const evMatch = e => { const tl = e.title.toLowerCase(); return scopeProjects.some(p => tl.includes(p.name.toLowerCase())) || (sc.fA && !sc.fP && tl.includes(areaOf(sc.fA).name.toLowerCase())); };
  const events = (ui.rEvents || []).filter(e => evDays(e).some(d => d >= from && d <= to) && (!sc.fA && !sc.fP ? true : evMatch(e)));
  let mins = 0;
  events.forEach(e => { if (!e.allDay) mins += Math.max(0, (new Date(e.end) - new Date(e.start)) / 6e4); });
  /* breakdown: by section → by project → by stage, one level below the current filter */
  const by = {};
  const B = n => by[n] || (by[n] = { done: 0, open: 0, overdue: 0 });
  const keyOf = (t, l) => {
    if (sc.fP) { const p = db.projects[sc.fP]; const sid = t ? t.stageId : null; return sid && stageName(p.id, sid) ? stageName(p.id, sid) : 'No stage'; }
    if (sc.fA) return (t ? projName(t.projectId) : l && l.project) || 'No project';
    const a = areaOf(t ? taskArea(t) : l && l.areaId); return a ? a.name : 'No section';
  };
  done.forEach(l => B(keyOf(db.tasks[l.taskId], l)).done++);
  open.forEach(t => { const k = B(keyOf(t)); k.open++; if (isOverdue(t)) k.overdue++; });
  const days = diffD(from, to) + 1, td = today();
  const perDay = {}; done.forEach(l => { const d = isoDay(l.at); perDay[d] = (perDay[d] || 0) + 1; });
  const wk = [0, 0, 0, 0, 0, 0, 0]; done.forEach(l => wk[pd(isoDay(l.at)).getDay()]++);
  const withDue = done.filter(l => l.due), onTime = withDue.filter(l => !(l.late > 0)).length;
  const lead = done.map(l => { const t = db.tasks[l.taskId]; return t && t.createdAt ? (new Date(l.at) - new Date(t.createdAt)) / 864e5 : null; }).filter(x => x !== null && x >= 0);
  const buckets = { overdue: overdue.length, today: open.filter(t => t.due === td).length, week: open.filter(t => t.due > td && t.due <= addD(td, 7)).length, later: open.filter(t => t.due > addD(td, 7)).length, none: open.filter(t => !t.due).length };
  const urgentOpen = open.filter(t => t.urgent).length;
  const overdueAge = overdue.length ? overdue.reduce((a, t) => a + diffD(t.due, td), 0) / overdue.length : 0;
  const inRd = iso => !!iso && isoDay(iso) >= from && isoDay(iso) <= to;
  const projDoneRange = scopeProjects.filter(p => p && p.done && inRd(p.doneAt)).length;
  const projOpen = scopeProjects.filter(p => p && !p.done).length, projDone = scopeProjects.filter(p => p && p.done).length;
  const notesN = sc.fA || sc.fP ? null : Object.values(db.notes).filter(n => !n.deleted && inRd(n.createdAt)).length;
  const doneDays = new Set(Object.values(db.log).filter(l => l.type === 'done' && sc.lOk(l)).map(l => isoDay(l.at)));
  let streak = 0; { let d = doneDays.has(td) ? td : addD(td, -1); while (doneDays.has(d) && streak < 2000) { streak++; d = addD(d, -1); } }
  const bestDay = Object.entries(perDay).sort((a, b) => b[1] - a[1])[0] || null;
  return { from, to, sc, logs, done, created, postponed, late, avgLate, open, stillOpen, overdue, planned, plannedDone, rep, events, hours: mins / 60, by, scopeProjects,
    days, perDay, wk, withDue, onTime, lead, buckets, urgentOpen, overdueAge, projDoneRange, projOpen, projDone, notesN, streak, activeDays: Object.keys(perDay).length, bestDay };
}
function reviewView() {
  const [from, to] = reviewRange();
  ensureReviewEvents(from, to);
  const r = reviewData(from, to);
  const sc = r.sc;
  const loading = ui.rEvents === null;
  const seg = (n, l) => `<button class="${ui.rDays === n ? 'on' : ''}" data-act="range" data-n="${n}" aria-pressed="${ui.rDays === n}">${l}</button>`;
  const stat = (k, v, s, cls = '', cc = '') => `<div class="card stat ${cc}"><span class="k">${k}</span><span class="v ${cls}">${v}</span><span class="s">${s}</span></div>`;
  const projOpts = (sc.fA ? areaProjects(sc.fA) : projects());
  const entries = Object.entries(r.by).sort((a, b) => (b[1].done + b[1].open) - (a[1].done + a[1].open));
  const max = Math.max(1, ...entries.map(([, v]) => v.done + v.open));
  const byTitle = sc.fP ? 'By stage' : sc.fA ? 'By project' : 'By section';
  const colorFor = n => { const a = AREAS.find(x => x.name === n); return a ? a.color : ''; };
  let focus = '';
  if (sc.fP) {
    const p = db.projects[sc.fP]; const s = projStats(p);
    focus = sec('Project', `<div class="card" style="padding:14px 16px">
      <div style="display:flex;justify-content:space-between;gap:10px;font-size:14px"><span dir="auto">${esc(p.name)}</span><span class="mut">${s.pct}% · ${s.done}/${s.total}</span></div>
      <div class="prog" style="margin:10px 0"><i style="width:${s.pct}%"></i></div>
      <div class="mut" style="font-size:12px">${p.deadline ? `Deadline ${esc(shortDay(p.deadline))} · ${diffD(today(), p.deadline) >= 0 ? diffD(today(), p.deadline) + ' days left' : '<span class="or">passed</span>'}` : 'No deadline'}</div>
      ${(p.stages || []).map(st => { const ts = tasks().filter(t => t.projectId === p.id && t.stageId === st.id); const d = ts.filter(t => t.done).length; const pc = ts.length ? Math.round(d / ts.length * 100) : 0; return `<div style="margin-top:12px"><div style="display:flex;justify-content:space-between;font-size:13px;gap:8px"><span dir="auto">${esc(st.name)}</span><span class="mut">${d}/${ts.length}${st.due ? ' · ' + esc(shortDay(st.due)) : ''}</span></div><div class="prog" style="margin-top:6px;height:4px"><i style="width:${pc}%"></i></div></div>`; }).join('')}
      <button class="btn full" style="margin-top:14px" data-act="open-project" data-id="${esc(p.id)}">Open project</button></div>`);
  } else if (sc.fA) {
    const ps = areaProjects(sc.fA);
    if (ps.length) focus = sec('Projects in ' + areaOf(sc.fA).name, `<div class="plist">${ps.map(pcardHTML).join('')}</div>`);
  }
  return `<div class="narrow">
    <div class="hdr"><div><div class="sub">${esc(shortDay(from))} – ${esc(shortDay(to))} · ${diffD(from, to) + 1} days</div><h1>Review</h1></div></div>
    <div class="rsel">
      <label><span class="sr">Section</span><select id="r-area"><option value="">All sections</option>${AREAS.map(a => `<option value="${a.id}" ${sc.fA === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>
      <label><span class="sr">Project</span><select id="r-proj"><option value="">${sc.fA ? 'Whole section' : 'All projects'}</option>${projOpts.map(p => `<option value="${esc(p.id)}" ${sc.fP === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
    </div>
    <div class="seg" role="group" aria-label="Range">${seg(7, '7 days')}${seg(14, '14 days')}${seg(30, '30 days')}${seg(0, 'Custom')}</div>
    ${ui.rDays === 0 ? `<div class="card" style="margin-top:10px"><div class="field"><label for="r-from">From</label><input type="date" id="r-from" value="${esc(from)}"></div><div class="field"><label for="r-to">To</label><input type="date" id="r-to" value="${esc(to)}"></div></div>` : ''}
    <div class="stats" style="margin-top:16px">
      ${stat('Tasks done', r.done.length, r.planned ? `${r.plannedDone} of ${r.planned} planned in range` : 'nothing planned in range', '', 'lite')}
      ${stat('Open now', r.open.length, r.overdue.length ? `<span class="or">${r.overdue.length} overdue</span>` : 'none overdue')}
      ${stat('Done late', r.late.length, r.late.length ? `avg ${r.avgLate.toFixed(1)} days late` : 'none', r.late.length ? 'or' : '')}
      ${stat(sc.fA || sc.fP ? 'Related events' : 'Meetings & events', loading ? '…' : r.events.length, loading ? 'loading calendar' : `${r.hours.toFixed(1)} h in calendar`)}
    </div>
    <p class="mut" style="font-size:13px;margin:12px 2px 0">${r.created.length} created · ${r.postponed.length} postponements · ${r.rep.filter(l => !l.late).length}/${r.rep.length} repeats on time</p>
    ${reviewNumbersHTML(r)}
    ${focus}
    ${entries.length ? sec(byTitle, `<div class="bars">${entries.map(([n, v]) => `<div><div class="l"><span dir="auto" style="display:flex;align-items:center;gap:7px">${colorFor(n) ? `<i class="adot" style="background:${colorFor(n)}"></i>` : ''}${esc(n)}</span><span class="mut">${v.done} done · ${v.open} open${v.overdue ? ` · <span class="or">${v.overdue} late</span>` : ''}</span></div><div class="t"><i style="width:${Math.round((v.done + v.open) / max * 100)}%;${colorFor(n) ? 'background:' + colorFor(n) : ''}"></i></div></div>`).join('')}</div>`) : ''}
    ${r.overdue.length ? sec('Overdue', r.overdue.slice(0, 12).map(t => taskHTML(t, { inArea: !!sc.fA })).join(''), { cls: 'or' }) : ''}
    ${sec('Export full summary', `<p class="mut" style="margin:0 0 12px;font-size:13px;line-height:1.55">${esc(sc.label)}: every task and event in the range — created, due and done times, section, project, notes, subtasks, repeats and postponements.</p>
      <button class="btn pri full" data-act="copy-md" ${loading ? 'disabled' : ''}>Copy for Claude (Markdown)</button>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:8px">
        <button class="btn" data-act="save-md" ${loading ? 'disabled' : ''} style="font-size:14px;padding:0 8px">Save to Drive</button>
        <button class="btn" data-act="dl-csv" ${loading ? 'disabled' : ''} style="font-size:14px;padding:0 8px">CSV</button>
        <button class="btn" data-act="dl-json" ${loading ? 'disabled' : ''} style="font-size:14px;padding:0 8px">JSON</button>
      </div>`)}
  </div>`;
}
function reviewNumbersHTML(r) {
  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const busiest = r.done.length ? r.wk.indexOf(Math.max(...r.wk)) : -1;
  const lead = avg(r.lead);
  const n = (k, v, s = '', cls = '') => `<div class="ncell ${cls}"><span class="k">${k}</span><span class="v">${v}</span>${s ? `<span class="s">${s}</span>` : ''}</div>`;
  const cells = [
    n('Completion rate', pct(r.plannedDone, r.planned), r.planned ? `${r.plannedDone} of ${r.planned} due in range` : 'nothing due in range', 'hi'),
    n('Done on time', pct(r.onTime, r.withDue.length), r.withDue.length ? `${r.onTime} of ${r.withDue.length} with a date` : 'no dated tasks done'),
    n('Per day', (r.done.length / r.days).toFixed(1), `${r.done.length} in ${r.days} days`),
    n('Active days', `${r.activeDays}/${r.days}`, 'days with something done'),
    n('Best day', r.bestDay ? r.bestDay[1] : '—', r.bestDay ? esc(shortDay(r.bestDay[0])) : ''),
    n('Streak', r.streak, r.streak === 1 ? 'day in a row' : 'days in a row', r.streak >= 3 ? 'hi' : ''),
    n('Time to finish', lead === null ? '—' : lead < 1 ? Math.round(lead * 24) + ' h' : lead.toFixed(1) + ' d', 'average, created → done'),
    n('Created vs done', `${r.created.length} / ${r.done.length}`, r.done.length >= r.created.length ? 'keeping up' : `${r.created.length - r.done.length} more added than done`),
    n('Busiest weekday', busiest >= 0 ? WD[busiest].slice(0, 3) : '—', busiest >= 0 ? `${r.wk[busiest]} done` : ''),
    n('Overdue age', r.overdue.length ? r.overdueAge.toFixed(1) + ' d' : '—', r.overdue.length ? `average over ${r.overdue.length} tasks` : 'nothing overdue', r.overdue.length ? 'warn' : ''),
    n('Urgent open', r.urgentOpen, 'marked urgent', r.urgentOpen ? 'warn' : ''),
    n('Projects', `${r.projOpen} · ${r.projDone}`, `open · completed${r.projDoneRange ? ` (${r.projDoneRange} in range)` : ''}`),
    n('Postponed', r.postponed.length, 'times a date was pushed'),
    r.notesN === null ? '' : n('Notes written', r.notesN, 'in range'),
  ].join('');
  /* done per day (per week for long ranges) */
  const weekly = r.days > 45;
  const slots = [];
  if (weekly) { let d = r.from; while (d <= r.to) { const e = addD(d, 6); let c = 0; for (let x = d; x <= e && x <= r.to; x = addD(x, 1)) c += r.perDay[x] || 0; slots.push([d, c]); d = addD(d, 7); } }
  else for (let d = r.from; d <= r.to; d = addD(d, 1)) slots.push([d, r.perDay[d] || 0]);
  const mx = Math.max(1, ...slots.map(s => s[1]));
  const every = Math.ceil(slots.length / 8);
  const chart = `<div class="dchart">${slots.map(([d, c], i) => `<span title="${esc(shortDay(d))}: ${c}"><b>${c || ''}</b><i style="height:${Math.max(3, Math.round(c / mx * 85))}%" class="${c ? '' : 'z'} ${d === today() ? 'now' : ''}"></i><em>${i % every === 0 ? esc(weekly ? shortDay(d) : String(pd(d).getDate())) : ''}</em></span>`).join('')}</div>`;
  const wmx = Math.max(1, ...r.wk);
  const wchart = `<div class="wchart">${r.wk.map((c, i) => `<div><span>${WD[i].slice(0, 3)}</span><span class="t"><i style="width:${Math.round(c / wmx * 100)}%"></i></span><span class="num">${c}</span></div>`).join('')}</div>`;
  const B = r.buckets, tot = Math.max(1, B.overdue + B.today + B.week + B.later + B.none);
  const seg = (v, c, l) => v ? `<i style="width:${v / tot * 100}%;background:${c}" title="${l}: ${v}"></i>` : '';
  const key = (v, c, l) => `<span><i style="background:${c}"></i>${l} <b>${v}</b></span>`;
  const due = `<div class="stack">${seg(B.overdue, 'var(--orange)', 'Overdue')}${seg(B.today, 'var(--sand)', 'Today')}${seg(B.week, 'var(--blue)', 'Next 7 days')}${seg(B.later, 'var(--green)', 'Later')}${seg(B.none, 'var(--s3)', 'No date')}</div>
    <div class="skey">${key(B.overdue, 'var(--orange)', 'Overdue')}${key(B.today, 'var(--sand)', 'Today')}${key(B.week, 'var(--blue)', 'Next 7 days')}${key(B.later, 'var(--green)', 'Later')}${key(B.none, 'var(--s3)', 'No date')}</div>`;
  return sec('In numbers', `<div class="nums">${cells}</div>`)
    + sec(weekly ? 'Done per week' : 'Done per day', `<div class="card chartc">${chart}</div>`)
    + `<div class="rgrid">${sec('By weekday', `<div class="card chartc">${wchart}</div>`)}${sec('Open tasks by due date', `<div class="card chartc">${due}</div>`)}</div>`;
}
function taskLine(t) {
  const bits = [];
  const a = areaOf(taskArea(t)); if (a) bits.push(a.name);
  const pn = projName(t.projectId); if (pn) bits.push(pn + (t.stageId && stageName(t.projectId, t.stageId) ? ' › ' + stageName(t.projectId, t.stageId) : ''));
  if (t.due) bits.push('due ' + t.due + (t.time ? ' ' + t.time : ''));
  if (t.urgent) bits.push('urgent');
  if (t.repeat) bits.push('repeats ' + t.repeat.freq);
  if (t.postponed) bits.push('postponed ' + t.postponed + 'x');
  const st = t.subtasks || []; if (st.length) bits.push(`subtasks ${st.filter(s => s.done).length}/${st.length}`);
  if ((t.images || []).length) bits.push(t.images.length + ' image(s)');
  return `- ${t.title}${bits.length ? ' — ' + bits.join(', ') : ''}`;
}
function buildMarkdown(r) {
  const L = [];
  L.push(`# Zerodocs control review: ${r.sc.label}, ${r.from} → ${r.to}`, '', `Generated ${new Date().toLocaleString('en-GB')} (${TZ}).`, '');
  L.push('## Summary');
  L.push(`- Tasks completed: ${r.done.length} (${r.plannedDone} of ${r.planned} tasks that were due in this period)`);
  L.push(`- Completed late: ${r.late.length}${r.late.length ? ` (average ${r.avgLate.toFixed(1)} days late)` : ''}`);
  L.push(`- Open now: ${r.open.length} (${r.overdue.length} overdue)`);
  L.push(`- Tasks created: ${r.created.length} · Postponements: ${r.postponed.length} · Still open from this period: ${r.stillOpen.length}`);
  L.push(`- Calendar: ${r.events.length} events, ${r.hours.toFixed(1)} hours of timed events`);
  L.push(`- Repeating tasks: ${r.rep.filter(l => !l.late).length}/${r.rep.length} completions on time`, '');
  const bE = Object.entries(r.by);
  if (bE.length) { L.push('## ' + (r.sc.fP ? 'By stage' : r.sc.fA ? 'By project' : 'By section')); bE.forEach(([n, v]) => L.push(`- ${n}: ${v.done} done, ${v.open} open, ${v.overdue} overdue`)); L.push(''); }
  L.push('## Day by day');
  for (let d = r.from; d <= r.to; d = addD(d, 1)) {
    const ev = r.events.filter(e => evDays(e).includes(d));
    const day = l => isoDay(l.at) === d;
    const dn = r.done.filter(day), cr = r.created.filter(day), po = r.postponed.filter(day);
    if (!ev.length && !dn.length && !cr.length && !po.length) continue;
    L.push('', `### ${fmtDay(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}`);
    if (ev.length) { L.push('Events:'); ev.forEach(e => L.push(`- ${evTime(e)} ${e.title}${e.location ? ' @ ' + e.location : ''}${e.calName ? ' [' + e.calName + ']' : ''}`)); }
    if (dn.length) {
      L.push('Completed:');
      dn.forEach(l => {
        const t = db.tasks[l.taskId];
        const bits = [];
        const a = areaOf(t ? taskArea(t) : l.areaId); if (a) bits.push(a.name);
        if (l.project) bits.push(l.project + (l.stage ? ' › ' + l.stage : ''));
        bits.push('at ' + hm(l.at));
        if (l.due) bits.push('due ' + l.due);
        if (l.late) bits.push(l.late + ' day(s) late');
        if (l.repeat) bits.push('repeats ' + l.repeat);
        if (l.urgent) bits.push('urgent');
        if (l.subtasks && l.subtasks !== '0/0') bits.push('subtasks ' + l.subtasks);
        L.push(`- ${l.title} — ${bits.join(', ')}`);
        if (t && t.notes && t.notes.trim()) L.push(`  Notes: ${t.notes.trim().replace(/\n+/g, ' / ')}`);
      });
    }
    if (cr.length) { L.push('Created:'); cr.forEach(l => L.push(`- ${l.title}${l.project ? ' (' + l.project + ')' : ''}${l.due ? ' — due ' + l.due : ''}`)); }
    if (po.length) { L.push('Postponed:'); po.forEach(l => L.push(`- ${l.title}: ${l.from} → ${l.to}`)); }
  }
  const open = r.open;
  L.push('', `## Open tasks today (${open.length})`);
  open.forEach(t => {
    L.push(taskLine(t));
    if (t.notes && t.notes.trim()) L.push(`  Notes: ${t.notes.trim().replace(/\n+/g, ' / ')}`);
    (t.subtasks || []).forEach(s => L.push(`  - [${s.done ? 'x' : ' '}] ${s.title}`));
  });
  const ps = r.scopeProjects;
  if (ps.length) {
    L.push('', '## Projects');
    ps.forEach(p => { const s = projStats(p); L.push(`- ${p.name}${areaOf(p.areaId) ? ' [' + areaOf(p.areaId).name + ']' : ''}: ${s.done}/${s.total} done${p.deadline ? ', deadline ' + p.deadline : ''}${(p.stages || []).length ? ', stages: ' + p.stages.map(x => x.name + (x.due ? ' (' + x.due + ')' : '')).join(' → ') : ''}`); });
  }
  return L.join('\n');
}
function csvCell(v) { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function buildCSV(r) {
  const rows = [['kind', 'date', 'time', 'title', 'section', 'project', 'stage', 'due', 'done_at', 'late_days', 'urgent', 'repeat', 'postponed', 'from', 'to', 'location', 'calendar', 'notes']];
  r.events.forEach(e => rows.push(['event', e.allDay ? e.start : isoDay(e.start), e.allDay ? 'all day' : hm(e.start) + '-' + hm(e.end), e.title, '', '', '', '', '', '', '', e.recurring ? 'yes' : '', '', '', '', e.location, e.calName, e.desc.replace(/\s+/g, ' ').slice(0, 500)]));
  r.logs.filter(l => ['done', 'created', 'postponed'].includes(l.type)).forEach(l => {
    if (l.type === 'done' && !r.done.includes(l)) return;
    const t = db.tasks[l.taskId];
    const la = areaOf(t ? taskArea(t) : l.areaId);
    rows.push([l.type, isoDay(l.at), hm(l.at), l.title, la ? la.name : '', l.project, l.stage, l.due, l.type === 'done' ? l.at : '', l.late || '', l.urgent ? 'yes' : '', l.repeat || '', t ? t.postponed || 0 : '', l.from || '', l.to || '', '', '', t ? (t.notes || '').replace(/\s+/g, ' ') : '']);
  });
  r.open.forEach(t => rows.push(['open', today(), t.time || '', t.title, (areaOf(taskArea(t)) || { name: '' }).name, projName(t.projectId), stageName(t.projectId, t.stageId), t.due || '', '', t.due && t.due < today() ? diffD(t.due, today()) : '', t.urgent ? 'yes' : '', t.repeat ? t.repeat.freq : '', t.postponed || 0, '', '', '', '', (t.notes || '').replace(/\s+/g, ' ')]));
  return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
}
function buildJSON(r) {
  return JSON.stringify({ range: { from: r.from, to: r.to, timezone: TZ }, generated: new Date().toISOString(), scope: r.sc.label, events: r.events, log: r.logs, tasks: tasks().filter(r.sc.tOk), projects: r.scopeProjects }, null, 2);
}
function download(name, text, mime) {
  if (NATIVE) { ZeroNative.save(name, mime, text); return; }
  const blob = new Blob([text], { type: mime }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch { } ta.remove(); return ok;
  }
}

/* ---------------- sheets ---------------- */
function openSheet(s) { const had = !!ui.sheet; ui.sheet = s; if (!had) history.pushState({ zsheet: 1 }, ''); renderSheet(); }
function closeSheet() {
  if (!ui.sheet) return;
  if (ui.sheet.type === 'image' && ui.sheet.prev) { ui.sheet = ui.sheet.prev; renderSheet(); return; }
  cleanupNote();
  if (history.state && history.state.zsheet) history.back();
  else { ui.sheet = null; renderSheet(); renderMain(); }
}
window.addEventListener('popstate', () => { if (ui.sheet) { cleanupNote(); ui.sheet = null; renderSheet(); renderMain(); } });
/* a note left empty disappears when you close it */
function cleanupNote() {
  const s = ui.sheet;
  if (s && s.type === 'list') { const l = db.lists[s.id]; if (l && !l.deleted && !(l.name || '').trim() && !l.items.length) { updList(l, { deleted: true }); } return; }
  if (!s || s.type !== 'note') return;
  const n = db.notes[s.id]; if (!n) return;
  clearTimeout(typeT);
  if (!(n.text || '').trim() && !(n.title || '').trim() && !hasInk(n)) { n.deleted = true; n.updatedAt = now(); }
  save();
}
function openEventSheet(ev, pre = {}) {
  const writable = visibleCals().filter(c => c.writable);
  const draft = ev ? {
    title: ev.title, allDay: ev.allDay,
    date: ev.allDay ? ev.start : isoDay(ev.start), endDate: ev.allDay ? addD(ev.end, -1) : '',
    start: ev.allDay ? '09:00' : hm(ev.start), end: ev.allDay ? '10:00' : hm(ev.end),
    location: ev.location, desc: ev.desc, calId: ev.calId
  } : {
    title: pre.title || '', allDay: false, date: pre.date || ui.sel || today(), endDate: '',
    start: pre.start || '09:00', end: pre.end || (() => { const [h, m] = (pre.start || '09:00').split(':').map(Number); return pad(Math.min(23, h + 1)) + ':' + pad(m); })(),
    location: '', desc: '', calId: (writable.find(c => c.primary) || writable[0] || { id: 'primary' }).id
  };
  openSheet({ type: 'event', ev, draft, edit: !ev });
}
function renderSheet() {
  const root = $('#sheet-root');
  const s = ui.sheet;
  document.body.style.overflow = s ? 'hidden' : '';
  if (!s) { root.innerHTML = ''; return; }
  let inner = '';
  if (s.type === 'task') { const t = db.tasks[s.id]; if (!t || t.deleted) { ui.sheet = null; root.innerHTML = ''; document.body.style.overflow = ''; return; } inner = taskSheet(t); }
  else if (s.type === 'event') inner = eventSheet(s);
  else if (s.type === 'settings') inner = settingsSheet();
  else if (s.type === 'note') { const n = db.notes[s.id]; if (!n || n.deleted) { ui.sheet = null; root.innerHTML = ''; document.body.style.overflow = ''; return; } inner = noteSheet(n); }
  else if (s.type === 'image') inner = imageSheet(s);
  else if (s.type === 'list') { const l = db.lists[s.id]; if (!l || l.deleted) { ui.sheet = null; root.innerHTML = ''; document.body.style.overflow = ''; return; } inner = listSheet(l); }
  const sc = $('.sheet', root); const top = sc ? sc.scrollTop : 0;
  if (s.type === 'note') { const nb = $('#n-body', root); const nt = nb ? nb.scrollTop : 0; root.innerHTML = inner; growNote(); bindInk(); try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { } const b2 = $('#n-body', root); if (b2) { b2.scrollTop = nt; drawInkView(); } return; }
  root.innerHTML = `<div class="sheet-bg" data-act="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${s.type}">${inner}</div>`;
  const nsc = $('.sheet', root); if (nsc) nsc.scrollTop = top;
  autoGrow(); hydrateImgs(root);
}
function autoGrow() { document.querySelectorAll('textarea.title-in').forEach(el => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }); }
function taskSheet(t) {
  const ta = taskArea(t);
  const ps = ta ? areaProjects(ta) : projects(); const p = t.projectId && db.projects[t.projectId];
  const stages = p ? p.stages || [] : [];
  const crumb = [areaOf(ta) ? areaOf(ta).name : '', projName(t.projectId), t.stageId ? stageName(t.projectId, t.stageId) : ''].filter(Boolean).join(' › ') || (t.repeat ? 'Repeating' : 'Task');
  const opt = (v, l, cur) => `<option value="${esc(v)}" ${String(cur ?? '') === String(v) ? 'selected' : ''}>${esc(l)}</option>`;
  const urg = isUrgent(t);
  return `
  <div class="sheet-top"><button class="ib" data-act="close-sheet" aria-label="Close">${I.l}</button><span class="crumb" dir="auto">${esc(crumb)}</span><button class="ib" data-act="del-task" aria-label="Delete task">${I.trash}</button></div>
  <div style="display:flex;gap:14px;align-items:flex-start">
    <button class="chk-big" data-act="toggle" data-id="${esc(t.id)}" aria-label="${t.done ? 'Mark not done' : 'Complete task'}" style="width:26px;height:26px;border-radius:13px;flex-shrink:0;margin-top:4px;padding:0;display:flex;align-items:center;justify-content:center;color:var(--mut);${t.done ? 'background:var(--s3);border:0' : `background:transparent;border:1.5px solid ${urg ? 'var(--orange)' : '#3A3A3F'}`}">${t.done ? I.check : ''}</button>
    <textarea id="t-title" class="title-in" rows="1" dir="auto" placeholder="Task title" aria-label="Title">${esc(t.title)}</textarea>
  </div>
  <div class="card" style="margin-top:18px">
    <div class="field"><label for="t-due">Due</label><input type="date" id="t-due" value="${esc(t.due || '')}" style="${isOverdue(t) ? 'color:var(--orange)' : ''}"></div>
    <div class="field"><label for="t-time">Time</label><input type="time" id="t-time" value="${esc(t.time || '')}"></div>
    <div class="field"><span class="lb">Urgent</span><button class="sw ${t.urgent ? 'on' : ''}" data-act="sw-urgent" role="switch" aria-checked="${!!t.urgent}" aria-label="Urgent"></button></div>
    <div class="field"><label for="t-repeat">Repeat</label><select id="t-repeat">${opt('', 'Never', t.repeat ? t.repeat.freq : '')}${opt('daily', 'Every day', t.repeat && t.repeat.freq)}${opt('weekly', 'Every week', t.repeat && t.repeat.freq)}${opt('monthly', 'Every month', t.repeat && t.repeat.freq)}${opt('yearly', 'Every year', t.repeat && t.repeat.freq)}</select></div>
    <div class="field"><label for="t-area">Section</label><select id="t-area">${opt('', 'None', ta || '')}${AREAS.map(a => opt(a.id, a.name, ta)).join('')}</select></div>
    <div class="field"><label for="t-project">Project</label><select id="t-project">${opt('', 'None', t.projectId || '')}${ps.map(x => opt(x.id, x.name, t.projectId)).join('')}</select></div>
    ${stages.length ? `<div class="field"><label for="t-stage">Stage</label><select id="t-stage">${opt('', '—', t.stageId || '')}${stages.map(x => opt(x.id, x.name, t.stageId)).join('')}</select></div>` : ''}
  </div>
  <div class="quick">${[['Today', today()], ['Tomorrow', addD(today(), 1)], ['Next week', addD(today(), 7)]].map(([l, v]) => `<button class="chip" data-act="due-quick" data-v="${v}">${l}</button>`).join('')}${t.due ? '<button class="chip" data-act="due-quick" data-v="">No date</button>' : ''}</div>
  ${sec('Subtasks', `${(t.subtasks || []).map(s => `<div class="sub ${s.done ? 'on' : ''}"><button class="box ${s.done ? 'on' : ''}" data-act="sub-toggle" data-sid="${esc(s.id)}" aria-label="Toggle subtask">${s.done ? I.check : ''}</button><input id="s-${esc(s.id)}" data-sub="${esc(s.id)}" dir="auto" value="${esc(s.title)}" aria-label="Subtask"><button class="ib x" data-act="sub-del" data-sid="${esc(s.id)}" aria-label="Delete subtask">${I.x}</button></div>`).join('')}
    ${addForm('sub', 'Add subtask', { id: 's-new' })}`, { right: (t.subtasks || []).length ? `<span class="mut">${(t.subtasks || []).filter(s => s.done).length} of ${(t.subtasks || []).length}</span>` : '' })}
  ${sec('Notes', `<textarea id="t-notes" class="ta" dir="auto" placeholder="Details, ideas, anything…">${esc(t.notes || '')}</textarea>
    ${(t.images || []).length ? `<div class="imgs">${t.images.map(im => `<button class="ph" data-act="img-open" data-img="${esc(im.id)}" aria-label="Open image"><img data-img="${esc(im.id)}" alt="">${im.local ? '<span class="pend">Uploading</span>' : ''}</button>`).join('')}</div>` : ''}
    <label class="img-add">${I.img}<span>Add image</span><input type="file" id="t-img" accept="image/*" multiple></label>`)}
  ${sec('Links', `${(t.links || []).map((l, i) => `<div style="display:flex;align-items:center;gap:8px;min-height:40px"><a href="${esc(l)}" target="_blank" rel="noopener" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;text-decoration:none;display:flex;align-items:center;gap:8px">${I.link}${esc(l.replace(/^https?:\/\//, ''))}</a><button class="ib" data-act="link-del" data-i="${i}" aria-label="Remove link">${I.x}</button></div>`).join('')}
    ${addForm('link', 'Paste a link', { id: 'l-new', type: 'url' })}`)}
  <p class="mut" style="font-size:12px;margin-top:26px">Created ${esc(new Date(t.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}${t.postponed ? ` · postponed ${t.postponed}×` : ''}${t.doneAt ? ` · done ${esc(new Date(t.doneAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}` : ''}</p>`;
}
function noteMeta(n) {
  const words = ((n.title || '') + ' ' + (n.text || '')).trim().split(/\s+/).filter(Boolean).length;
  return `${esc(new Date(n.updatedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))} · ${words} ${words === 1 ? 'word' : 'words'}`;
}
/* a full page for writing: title on top, then as much text as you like */
function noteSheet(n) {
  if (hasInk(n)) return inkSheet(n);
  return `<div class="writer" role="dialog" aria-label="Note" style="--npage:${noteColor(n)}">
    <div class="bar"><button class="ib" data-act="close-sheet" aria-label="Back">${I.l}</button><span class="meta" id="n-meta">${noteMeta(n)}</span><button class="ib" data-act="del-note" aria-label="Delete note">${I.trash}</button></div>
    ${noteToolsHTML(n)}
    <div class="body" id="n-body">
      <textarea id="n-title" class="wt" rows="1" dir="auto" placeholder="Title" aria-label="Title">${esc(n.title || '')}</textarea>
      <div class="rule"></div>
      <div id="n-rich" class="wb rich" contenteditable="true" dir="auto" role="textbox" aria-multiline="true" aria-label="Note" data-ph="Start writing…">${richForEditor(n)}</div>
    </div></div>`;
}
function growNote() { ['n-title', 'n-text'].forEach(id => { const el = document.getElementById(id); if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }); }
function imageSheet(s) {
  return `
  <div class="sheet-top"><button class="ib" data-act="close-sheet" aria-label="Back">${I.l}</button><span class="crumb">Image</span><button class="ib" data-act="img-del" aria-label="Delete image">${I.trash}</button></div>
  <div class="viewer ph"><img data-img="${esc(s.img)}" alt=""></div>
  ${s.img.startsWith('l_') ? '<p class="mut" style="font-size:12px;margin-top:10px">Saved on this device. It will upload to Drive › Zero › images when you are online.</p>' : ''}`;
}
function eventSheet(s) {
  const f = s.draft; const ev = s.ev;
  const ro = ev && !ev.writable;
  const writable = visibleCals().filter(c => c.writable);
  const offline = !authed() || !navigator.onLine;
  return `
  <div class="sheet-top"><button class="ib" data-act="close-sheet" aria-label="Close">${I.l}</button><span class="crumb">${ev ? 'Google Calendar event' : 'New event'}</span>${ev && !ro ? `<button class="ib" data-act="ev-del" aria-label="Delete event">${I.trash}</button>` : '<span style="width:40px"></span>'}</div>
  <textarea id="ev-title" class="title-in" rows="1" dir="auto" placeholder="Meeting or event title" aria-label="Title" ${ro ? 'readonly' : ''}>${esc(f.title)}</textarea>
  <div class="card" style="margin-top:18px">
    <div class="field"><span class="lb">All day</span><button class="sw blue ${f.allDay ? 'on' : ''}" data-act="ev-allday" role="switch" aria-checked="${f.allDay}" aria-label="All day" ${ro ? 'disabled' : ''}></button></div>
    <div class="field"><label for="ev-date">${f.allDay ? 'From' : 'Date'}</label><input type="date" id="ev-date" value="${esc(f.date)}" ${ro ? 'readonly' : ''}></div>
    ${f.allDay ? `<div class="field"><label for="ev-enddate">To</label><input type="date" id="ev-enddate" value="${esc(f.endDate || f.date)}" ${ro ? 'readonly' : ''}></div>` :
      `<div class="field"><label for="ev-start">Starts</label><input type="time" id="ev-start" value="${esc(f.start)}" ${ro ? 'readonly' : ''}></div>
       <div class="field"><label for="ev-end">Ends</label><input type="time" id="ev-end" value="${esc(f.end)}" ${ro ? 'readonly' : ''}></div>`}
    ${!ev && writable.length > 1 ? `<div class="field"><label for="ev-cal">Calendar</label><select id="ev-cal">${writable.map(c => `<option value="${esc(c.id)}" ${c.id === f.calId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>` : ''}
    ${ev ? `<div class="field"><span class="lb">Calendar</span><span style="font-size:14px" dir="auto">${esc(ev.calName || 'Google Calendar')}</span></div>` : ''}
  </div>
  <div style="margin-top:12px"><input id="ev-loc" class="tin" dir="auto" placeholder="Location" value="${esc(f.location)}" aria-label="Location" ${ro ? 'readonly' : ''}></div>
  <div style="margin-top:10px"><textarea id="ev-desc" class="ta" dir="auto" placeholder="Notes" aria-label="Notes" ${ro ? 'readonly' : ''}>${esc(f.desc)}</textarea></div>
  ${ro ? '<p class="mut" style="font-size:13px">This calendar is read-only.</p>' : `<button class="btn pri full" style="margin-top:16px" data-act="ev-save" ${s.busy || offline ? 'disabled' : ''}>${s.busy ? 'Saving…' : ev ? 'Save changes' : 'Add to Google Calendar'}</button>
  ${offline ? '<p class="mut" style="font-size:13px">Events need an internet connection and Google.</p>' : ''}`}
  ${ev && ev.recurring ? '<p class="mut" style="font-size:12px;margin-top:10px">Repeating event: changes apply to this occurrence only.</p>' : ''}
  ${ev && ev.link ? `<a href="${esc(ev.link)}" target="_blank" rel="noopener" class="btn full" style="margin-top:10px;text-decoration:none">Open in Google Calendar</a>` : ''}`;
}
function settingsSheet() {
  const last = LS.get('lastSync', 0);
  const folderId = LS.get('folderId', null);
  const hidden = db.prefs.hiddenCals || [];
  return `
  <div class="sheet-top"><button class="ib" data-act="close-sheet" aria-label="Close">${I.l}</button><span class="crumb">Settings</span><span style="width:40px"></span></div>
  ${sec('Account', `<div class="card"><div class="field"><span class="lb">Google</span><span style="font-size:14px">${esc(LS.get('email', '') || '—')}</span></div>
    <div class="field"><span class="lb">Status</span><span style="font-size:14px">${authed() ? 'Connected' : '<button class="pill" data-act="connect">Reconnect</button>'}</span></div></div>`)}
  ${sec('Sync', `<div class="card"><div class="field"><span class="lb">Last synced</span><span style="font-size:14px" class="num">${last ? esc(new Date(last).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) : 'Not yet'}</span></div>
    <div class="field"><span class="lb">Data file</span><span style="font-size:14px">Drive › Zero › zero-data.json</span></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px"><button class="btn" data-act="sync-now">${I.sync} Sync now</button>${folderId ? `<a class="btn" style="text-decoration:none" target="_blank" rel="noopener" href="https://drive.google.com/drive/folders/${esc(folderId)}">Open in Drive</a>` : '<span></span>'}</div>`)}
  ${cals.length ? sec('Calendars shown', `<div class="card">${cals.filter(c => c.selected).map(c => `<div class="field"><span class="lb" style="display:flex;align-items:center;gap:8px;color:var(--tx);min-width:0"><i style="width:8px;height:8px;border-radius:4px;background:${esc(c.color || '#7AA2FF')};flex-shrink:0"></i><span dir="auto" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</span></span><button class="sw blue ${hidden.includes(c.id) ? '' : 'on'}" data-act="cal-toggle" data-id="${esc(c.id)}" role="switch" aria-checked="${!hidden.includes(c.id)}" aria-label="Show ${esc(c.name)}"></button></div>`).join('')}</div>`) : ''}
  ${NATIVE ? sec('Home screen', `<button class="btn full" data-act="pin-widget">Add the widget to your home screen</button><p class="mut" style="margin:10px 0 0;font-size:13px;line-height:1.6">Shows today's events and urgent tasks. Long-press the app icon for quick actions.</p>`) : sec('Install', `${/Android/i.test(navigator.userAgent) ? `<a class="btn full" style="text-decoration:none;margin-bottom:10px" href="${APK_URL}">Download the Android app (with widget)</a>` : ''}` + (deferredPrompt ? '<button class="btn full" data-act="install">Install Zerodocs control on this device</button>' : '<p class="mut" style="margin:0;font-size:13px;line-height:1.6">Chrome on Android: menu ⋮ › Add to Home screen / Install app. Chrome on Mac: the install icon in the address bar, or menu › Cast, save and share › Install page as app.</p>'))}
  ${sec('Quick add tips', `<p class="mut" style="margin:0;font-size:13px;line-height:1.8" dir="auto">غداً · بعد غد · الخميس · 15/11 · بعد 3 أيام · ٤م · 16:30 · عاجل أو ! · #مشروع · كل شهر / كل أسبوع / كل يوم<br>Sections: #housing #zerodocs #dorba #outsource #personal (or #سكن #دربة #شخصي). Inside a section tab, new tasks go to that section automatically.<br>Start with @ (or اجتماع + time) to create a Google Calendar event.<br>Press N on a keyboard to jump to quick add.</p>`)}
  <button class="btn danger full" style="margin-top:26px" data-act="signout">Sign out on this device</button>`;
}

/* ---------------- interaction ---------------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });

function go(view) { ui.view = view; LS.set('view', view); if (view !== 'project') { ui.projectId = null; } LS.set('projectId', ui.projectId); ui.showDone = false; renderMain(); window.scrollTo(0, 0); }
function closeSheetQuiet() { if (ui.sheet) { if (history.state && history.state.zsheet) history.back(); ui.sheet = null; renderSheet(); } }
function openProject(id) { if (!db.projects[id]) return; ui.projectId = id; ui.view = 'project'; LS.set('view', 'project'); LS.set('projectId', id); renderMain(); window.scrollTo(0, 0); }
function openNote(id) {
  if (INK_TABLET) { const n = db.notes[id]; if (n) { try { ZeroNative.openInk(JSON.stringify(n)); return; } catch { } } }
  openSheet({ type: 'note', id });
  setTimeout(() => { const n = db.notes[id]; const i = n && !(n.title || n.text) ? $('#n-title') : null; if (i) i.focus(); }, 80);
}
function setMonth(m) { ui.month = m; renderMain(); refreshMonth(m); }
function monthAdd(m, n) { const d = pd(m + '-01'); d.setMonth(d.getMonth() + n); return ymd(d).slice(0, 7); }
function curTask() { return ui.sheet && ui.sheet.type === 'task' ? db.tasks[ui.sheet.id] : null; }

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act; const t = curTask();
  switch (a) {
    case 'connect-first': connect(true); break;
    case 'connect': connect(false); break;
    case 'nav': go(el.dataset.v); break;
    case 'tfilter': ui.tFilter = el.dataset.v; renderMain(); break;
    case 'new-note': { const n = newNote(''); openNote(n.id); break; }
    case 'open-note': if (db.notes[el.dataset.id]) openNote(el.dataset.id); break;
    case 'ink-zoom': ui.inkZoom = !ui.inkZoom; renderSheet(); break;
    case 'del-note': { const s = ui.sheet; const n = s && db.notes[s.id]; if (n && ((!(n.text || '').trim() && !(n.title || '').trim() && !hasInk(n)) || confirm('Delete this note?'))) { n.deleted = true; n.text = n.text || ''; n.updatedAt = now(); save(); closeSheet(); toast('Note deleted'); } break; }
    case 'img-open': if (t) { ui.sheet = { type: 'image', img: el.dataset.img, taskId: t.id, prev: ui.sheet }; renderSheet(); } break;
    case 'img-del': { const s = ui.sheet; const x = s && db.tasks[s.taskId]; if (x && confirm('Remove this image?')) { removeImage(x, s.img); ui.sheet = s.prev; renderSheet(); renderMain(); } break; }
    case 'pick': ui.sel = el.dataset.d; if (ui.sel.slice(0, 7) !== ui.month) setMonth(ui.sel.slice(0, 7)); else renderMain(); break;
    case 'prev': setMonth(monthAdd(ui.month, -1)); break;
    case 'next': setMonth(monthAdd(ui.month, 1)); break;
    case 'today': ui.sel = today(); setMonth(today().slice(0, 7)); break;
    case 'kmove': { kmove(db.tasks[el.dataset.id], el.dataset.to); renderMain(); break; }
    case 'toggle': { const x = db.tasks[el.dataset.id]; if (x) { toggleDone(x); renderMain(); if (ui.sheet) renderSheet(); } break; }
    case 'open-task': if (db.tasks[el.dataset.id] && !db.tasks[el.dataset.id].deleted) openSheet({ type: 'task', id: el.dataset.id }); break;
    case 'open-ev': { const ev = findEv(el.dataset.k); if (ev) openEventSheet(ev); break; }
    case 'new-event': openEventSheet(null, { date: el.dataset.d }); break;
    case 'new-task': { const c = qaCtx(); const x = newTask({ due: el.dataset.d || null, areaId: c.areaId || null, projectId: c.projectId || null }); openSheet({ type: 'task', id: x.id, fresh: true }); setTimeout(() => { const i = $('#t-title'); if (i) i.focus(); }, 60); break; }
    case 'close-sheet': closeSheet(); break;
    case 'settings': openSheet({ type: 'settings' }); break;
    case 'del-task': if (t && confirm('Delete this task?')) { addLog('deleted', t); upd(t, { deleted: true }); closeSheet(); toast('Task deleted'); } break;
    case 'sw-urgent': if (t) { upd(t, { urgent: !t.urgent }); renderSheet(); renderMain(); } break;
    case 'due-quick': if (t) { setDue(t, el.dataset.v); renderSheet(); renderMain(); } break;
    case 'sub-toggle': if (t) { upd(t, { subtasks: t.subtasks.map(s => s.id === el.dataset.sid ? { ...s, done: !s.done } : s) }); renderSheet(); renderMain(); } break;
    case 'sub-del': if (t) { upd(t, { subtasks: t.subtasks.filter(s => s.id !== el.dataset.sid) }); renderSheet(); renderMain(); } break;
    case 'link-del': if (t) { const l = [...(t.links || [])]; l.splice(+el.dataset.i, 1); upd(t, { links: l }); renderSheet(); } break;
    case 'ev-allday': if (ui.sheet) { ui.sheet.draft.allDay = !ui.sheet.draft.allDay; renderSheet(); } break;
    case 'ev-save': saveEvent(); break;
    case 'ev-del': deleteEvent(); break;
    case 'open-project': closeSheetQuiet(); openProject(el.dataset.id); break;
    case 'add-stage': { const p = db.projects[ui.projectId]; if (p) { const st = { id: uid(), name: 'New stage', due: null }; upd(p, { stages: [...(p.stages || []), st] }); renderMain(); setTimeout(() => { const i = document.getElementById('st-' + st.id); if (i) { i.focus(); i.select(); } }, 30); } break; }
    case 'del-stage': { const p = db.projects[ui.projectId]; if (p && confirm('Delete this stage? Its tasks stay in the project.')) { tasks().filter(x => x.stageId === el.dataset.sid).forEach(x => upd(x, { stageId: null })); upd(p, { stages: p.stages.filter(s => s.id !== el.dataset.sid) }); renderMain(); } break; }
    case 'del-project': { const p = db.projects[ui.projectId]; if (p && confirm(`Delete project “${p.name}”? Its tasks are kept without a project.`)) { tasks().filter(x => x.projectId === p.id).forEach(x => upd(x, { projectId: null, stageId: null, areaId: x.areaId || p.areaId || null })); upd(p, { deleted: true }); go(p.areaId || 'home'); } break; }
    case 'range': ui.rDays = +el.dataset.n; if (ui.rDays === 0 && !ui.rFrom) { const [f, to] = [addD(today(), -13), today()]; ui.rFrom = f; ui.rTo = to; } renderMain(); break;
    case 'copy-md': { const [f, to] = reviewRange(); copyText(buildMarkdown(reviewData(f, to))).then(ok => toast(ok ? 'Copied — paste it in a chat with Claude' : 'Copy failed')); break; }
    case 'save-md': saveReviewToDrive(); break;
    case 'dl-csv': { const [f, to] = reviewRange(); download(`zero-review-${f}-to-${to}.csv`, buildCSV(reviewData(f, to)), 'text/csv;charset=utf-8'); break; }
    case 'dl-json': { const [f, to] = reviewRange(); download(`zero-review-${f}-to-${to}.json`, buildJSON(reviewData(f, to)), 'application/json'); break; }
    case 'sync-now': if (!authed()) { connect(false); } else { sync(); refreshMonth(ui.month, true); loadCals().catch(() => { }); toast('Syncing…'); } break;
    case 'signout': signOut(); break;
    case 'cal-toggle': { const h = new Set(db.prefs.hiddenCals || []); h.has(el.dataset.id) ? h.delete(el.dataset.id) : h.add(el.dataset.id); db.prefs = { ...db.prefs, hiddenCals: [...h], updatedAt: now() }; save(); renderSheet(); renderMain(); refreshMonth(ui.month, true); break; }
    case 'pin-widget': try { ZeroNative.pinWidget(); } catch { } break;
    case 'install': if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.finally(() => { deferredPrompt = null; renderSheet(); }); } break;
    case 'show-done': ui.showDone = !ui.showDone; renderMain(); break;
    case 'home-all': ui.homeAll = !ui.homeAll; renderMain(); break;
    case 'show-donep': ui.showDoneP = !ui.showDoneP; renderMain(); break;
    case 'proj-done': {
      const p = db.projects[ui.projectId]; if (!p) break;
      if (p.done) { upd(p, { done: false, doneAt: null }); renderMain(); break; }
      const left = tasks().filter(x => x.projectId === p.id && !x.done).length;
      if (left && !confirm(`${left} ${left === 1 ? 'task is' : 'tasks are'} still open in this project. Mark it completed anyway?`)) break;
      upd(p, { done: true, doneAt: new Date().toISOString() }); toast('Project completed'); renderMain(); break;
    }
    case 'focus': { const f = document.getElementById(el.dataset.f); if (f) { f.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => f.focus(), 250); } break; }
    case 'new-list': { const l = newList(el.dataset.area || 'personal', el.dataset.kind || 'list'); openSheet({ type: 'list', id: l.id }); setTimeout(() => { const i = $('#l-name'); if (i) i.focus(); }, 80); break; }
    case 'hcell': {
      const l = db.lists[el.dataset.id]; if (!l) break; const d = el.dataset.d;
      if (l.htype === 'num') { ui.hSel = ui.hSel || {}; ui.hSel[l.id] = d; renderMain(); setTimeout(() => { const i = document.getElementById('hn-' + l.id); if (i) i.focus(); }, 30); break; }
      const v = hv(l, d), vals = { ...(l.vals || {}) };
      if (v === true) vals[d] = false; else if (v === false) delete vals[d]; else vals[d] = true;
      updList(l, { vals }); renderMain(); break;
    }
    case 'hmonth': { const l = db.lists[el.dataset.id]; if (!l) break; ui.hMonth = ui.hMonth || {}; const m = monthAdd(ui.hMonth[l.id] || today().slice(0, 7), +el.dataset.dir); ui.hMonth[l.id] = m >= today().slice(0, 7) ? null : m; renderMain(); break; }
    case 'hclear': { const l = db.lists[el.dataset.id]; if (!l) break; const vals = { ...(l.vals || {}) }; delete vals[el.dataset.d]; updList(l, { vals }); renderMain(); break; }
    case 'htype': { const l = db.lists[el.dataset.id]; if (!l) break; const v = el.dataset.v;
      /* keep what was recorded where it still makes sense */
      const vals = {}; Object.entries(l.vals || {}).forEach(([k, x]) => { if (v === 'num' ? typeof x === 'number' : typeof x === 'boolean') vals[k] = x; });
      if (Object.keys(l.vals || {}).length && Object.keys(vals).length < Object.keys(l.vals || {}).length && !confirm('Days recorded with the other type will be cleared. Switch?')) break;
      updList(l, { htype: v, vals }); renderSheet(); renderMain(); break; }
    case 'nfmt': { const f = el.dataset.fmt; if (f === 'h1' || f === 'h2' || f === 'p') richBlock(f); else richWeight(f); richToolsState(); break; }
    case 'ncolors': ui.nColors = !ui.nColors; renderSheet(); break;
    case 'ncolor': { const n = ui.sheet && db.notes[ui.sheet.id]; if (n) { n.color = el.dataset.v === NOTE_COLORS[0][0] ? null : el.dataset.v; n.updatedAt = now(); save(); ui.nColors = false; renderSheet(); } break; }
    case 'list-edit': if (db.lists[el.dataset.id]) openSheet({ type: 'list', id: el.dataset.id }); break;
    case 'list-tick': { const l = db.lists[el.dataset.id]; if (!l) break; const k = periodKey(l.repeat); const cur = new Set(listChecks(l, k)); const it = el.dataset.item; cur.has(it) ? cur.delete(it) : cur.add(it); updList(l, { checks: { ...(l.checks || {}), [k]: [...cur] } }); renderMain(); break; }
    case 'list-rep': { const l = db.lists[el.dataset.id]; if (l) { updList(l, { repeat: el.dataset.v }); renderSheet(); renderMain(); } break; }
    case 'list-up': { const l = db.lists[el.dataset.id]; const i = +el.dataset.i; if (l && i > 0) { const it = [...l.items]; [it[i - 1], it[i]] = [it[i], it[i - 1]]; updList(l, { items: it }); renderSheet(); renderMain(); } break; }
    case 'list-item-del': { const l = db.lists[el.dataset.id]; if (l) { updList(l, { items: l.items.filter(x => x.id !== el.dataset.item) }); renderSheet(); renderMain(); } break; }
    case 'list-del': { const l = db.lists[el.dataset.id]; if (l && ((!l.items.length && !Object.keys(l.vals || {}).length) || confirm(`Delete “${l.name || 'this list'}” and its history?`))) { updList(l, { deleted: true }); closeSheet(); toast('List deleted'); } break; }
    case 'qa-go': { const i = document.getElementById(el.dataset.for); if (i) submitQA(i); break; }
  }
});
async function saveReviewToDrive() {
  if (!authed() || !navigator.onLine) { toast('Connect to Google first'); return; }
  const [f, to] = reviewRange();
  try {
    const folder = await ensureFolder();
    const res = await createFile(`Zerodocs review ${f} to ${to}.md`, buildMarkdown(reviewData(f, to)), 'text/markdown', folder);
    toast('Saved in Drive › Zero');
    if (res.webViewLink) console.log(res.webViewLink);
  } catch (e) { console.error(e); toast('Could not save to Drive'); }
}
function submitQA(input) {
  const v = input.value;
  if (!v.trim()) return;
  if (ui.view === 'notes' || ui.view === 'home') { newNote(v.trim()); ui.qa = ''; input.value = ''; renderMain(); toast('Note saved'); return; }
  if (quickAdd(v, qaCtx())) { ui.qa = ''; input.value = ''; document.querySelectorAll('.qa input').forEach(x => { x.value = ''; }); document.querySelectorAll('.qa-prev').forEach(x => { x.innerHTML = ''; }); renderMain(); }
}
document.addEventListener('keydown', e => {
  const el = e.target;
  if (e.key === 'Escape' && ui.sheet) { closeSheet(); return; }
  if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !/INPUT|TEXTAREA|SELECT/.test(el.tagName) && !ui.sheet) {
    const i = window.innerWidth >= 900 ? ($('#qa-d') || $('#qa-h')) : $('#qa-m'); if (i) { e.preventDefault(); i.focus(); } return;
  }
  if (e.key !== 'Enter' || e.isComposing) return;
  if (el.form) return; /* forms submit themselves (works with Arabic keyboards too) */
  if (el.classList.contains('hnum')) { e.preventDefault(); el.blur(); return; }
  const k = el.dataset && el.dataset.enter;
  if (el.id === 't-title' || el.id === 'ev-title') { e.preventDefault(); el.blur(); return; }
  if (el.id === 'n-title') { e.preventDefault(); const b = $('#n-text') || $('#n-rich'); if (b) b.focus(); return; }
  if (!k) return;
  e.preventDefault();
  const v = el.value.trim(); const t = curTask();
  if (k === 'qa') submitQA(el);
});
/* every add-row is a <form>: Enter or the Add button both land here */
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault();
  const input = f.querySelector('input'); const v = (input.value || '').trim(); const kind = f.dataset.form; const t = curTask();
  const refocus = id => setTimeout(() => { const i = document.getElementById(id); if (i) i.focus(); }, 20);
  if (kind === 'qa') { submitQA(input); return; }
  if (!v) { input.focus(); return; }
  if (kind === 'sub' && t) { upd(t, { subtasks: [...(t.subtasks || []), { id: uid(), title: v, done: false }] }); renderSheet(); renderMain(); refocus('s-new'); }
  else if (kind === 'link' && t) { const url = /^https?:\/\//i.test(v) ? v : 'https://' + v; upd(t, { links: [...(t.links || []), url] }); renderSheet(); }
  else if (kind === 'board') {
    const before = new Set(Object.keys(db.tasks));
    quickAdd(v, { projectId: ui.projectId, areaId: (db.projects[ui.projectId] || {}).areaId || null });
    if (f.dataset.st === 'doing') Object.keys(db.tasks).filter(k => !before.has(k)).forEach(k => upd(db.tasks[k], { status: 'doing' }));
    renderMain(); refocus(input.id);
  }
  else if (kind === 'stage') { quickAdd(v, { projectId: ui.projectId, areaId: (db.projects[ui.projectId] || {}).areaId || null, stageId: f.dataset.sid || null }); renderMain(); refocus(input.id); }
  else if (kind === 'list-item') { const l = db.lists[f.dataset.lid]; if (l) { updList(l, { items: [...l.items, l.kind === 'habit' ? { id: uid(), title: v, type: /وزن|weight|kg|كيلو|steps|خطوات|ساعات|hours|ريال|omr|\$|مبلغ|سعرات|kcal/i.test(v) ? 'num' : 'check' } : { id: uid(), title: v }] }); renderMain(); if (ui.sheet && ui.sheet.type === 'list') renderSheet(); refocus(input.id); } }
  else if (kind === 'proj') { const aid = areaOf(ui.view) ? ui.view : null; const p = newProject(v, aid); toast('Project created'); openProject(p.id); }
  else if (kind === 'area-task') { quickAdd(v, { areaId: ui.view }); renderMain(); refocus('area-new'); }
});
let typeT;
document.addEventListener('input', e => {
  const el = e.target; const t = curTask();
  if (el.dataset && el.dataset.enter === 'qa') {
    ui.qa = el.value;
    const prev = document.getElementById(el.id + '-prev'); if (prev) prev.innerHTML = ui.view === 'notes' || ui.view === 'home' ? '' : qaPreview(el.value);
    return;
  }
  if (el.classList.contains('title-in') && el.tagName === 'TEXTAREA') { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  if (t && el.id === 't-title') { t.title = el.value; t.updatedAt = now(); clearTimeout(typeT); typeT = setTimeout(save, 600); return; }
  if (el.classList && el.classList.contains('hunit')) { const l = db.lists[el.dataset.lid]; if (l) { l.items = l.items.map(x => x.id === el.dataset.item ? { ...x, unit: el.value } : x); l.updatedAt = now(); clearTimeout(typeT); typeT = setTimeout(() => { save(); renderMain(); }, 500); } return; }
  if (el.id === 'h-unit') { const l = db.lists[el.dataset.lid]; if (l) { l.unit = el.value; l.updatedAt = now(); clearTimeout(typeT); typeT = setTimeout(() => { save(); renderMain(); }, 500); } return; }
  if (el.id === 'n-rich') { richEnsureBlock(); richSave(); return; }
  if (el.id === 'l-name' && ui.sheet && ui.sheet.type === 'list') { const l = db.lists[ui.sheet.id]; if (l) { l.name = el.value; l.updatedAt = now(); clearTimeout(typeT); typeT = setTimeout(() => { save(); renderMain(); }, 500); } return; }
  if (el.id === 'note-q') { ui.nq = el.value; const pos = el.selectionStart; renderMain(); const q = $('#note-q'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch { } } return; }
  if ((el.id === 'n-text' || el.id === 'n-title') && ui.sheet && ui.sheet.type === 'note') {
    const n = db.notes[ui.sheet.id];
    if (n) { if (el.id === 'n-title') n.title = el.value; else n.text = el.value; n.updatedAt = now(); clearTimeout(typeT); typeT = setTimeout(save, 500); }
    el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px';
    if ($('#ink-page')) layoutInk();
    const m = document.getElementById('n-meta'); if (m && n) m.innerHTML = noteMeta(n);
    return;
  }
  if (t && el.id === 't-notes') { t.notes = el.value; t.updatedAt = now(); clearTimeout(typeT); typeT = setTimeout(save, 600); return; }
  if (t && el.dataset.sub) { t.subtasks = t.subtasks.map(s => s.id === el.dataset.sub ? { ...s, title: el.value } : s); t.updatedAt = now(); clearTimeout(typeT); typeT = setTimeout(save, 600); return; }
  if (ui.sheet && ui.sheet.type === 'event') {
    const f = ui.sheet.draft;
    if (el.id === 'ev-title') f.title = el.value;
    else if (el.id === 'ev-loc') f.location = el.value;
    else if (el.id === 'ev-desc') f.desc = el.value;
    return;
  }
  const p = ui.projectId && db.projects[ui.projectId];
  if (p && el.id === 'proj-name') { p.name = el.value; p.updatedAt = now(); clearTimeout(typeT); typeT = setTimeout(save, 600); return; }
  if (p && el.dataset.stage) { p.stages = p.stages.map(s => s.id === el.dataset.stage ? { ...s, name: el.value } : s); p.updatedAt = now(); clearTimeout(typeT); typeT = setTimeout(save, 600); }
});
document.addEventListener('change', e => {
  const he = e.target;
  if (he.classList && he.classList.contains('hnum')) {
    const l = db.lists[he.dataset.lid]; if (!l) return;
    const raw = he.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫,]/g, '.').trim();
    const vals = { ...(l.vals || {}) };
    if (raw === '') delete vals[he.dataset.k]; else { const n = parseFloat(raw); if (isNaN(n)) { toast('Type a number'); return; } vals[he.dataset.k] = n; }
    updList(l, { vals }); renderMain(); return;
  }
  const el = e.target; const t = curTask();
  if (t) {
    if (el.id === 't-due') { setDue(t, el.value || null); renderSheet(); renderMain(); return; }
    if (el.id === 't-time') { upd(t, { time: el.value || null }); renderMain(); return; }
    if (el.id === 't-repeat') {
      const f = el.value; upd(t, { repeat: f ? { freq: f, interval: 1, day: f === 'monthly' ? pd(t.due || today()).getDate() : undefined } : null, due: t.due || (f ? today() : null) });
      renderSheet(); renderMain(); return;
    }
    if (el.id === 't-project') { const np = el.value ? db.projects[el.value] : null; upd(t, { projectId: el.value || null, stageId: null, areaId: np && np.areaId ? np.areaId : taskArea(t) }); renderSheet(); renderMain(); return; }
    if (el.id === 't-area') { const keepP = t.projectId && db.projects[t.projectId] && db.projects[t.projectId].areaId === (el.value || null); upd(t, { areaId: el.value || null, projectId: keepP ? t.projectId : null, stageId: keepP ? t.stageId : null }); renderSheet(); renderMain(); return; }
    if (el.id === 't-img') { const files = [...(el.files || [])]; el.value = ''; if (files.length) { toast('Adding image…'); addImages(t, files); } return; }
    if (el.id === 't-stage') { upd(t, { stageId: el.value || null }); renderSheet(); renderMain(); return; }
    if (el.id === 't-title' || el.id === 't-notes' || el.dataset.sub) { save(); renderMain(); return; }
  }
  if (ui.sheet && ui.sheet.type === 'event') {
    const f = ui.sheet.draft;
    if (el.id === 'ev-date') { const old = f.date; f.date = el.value || f.date; if (f.endDate && f.endDate < f.date) f.endDate = f.date; if (!old) { } }
    else if (el.id === 'ev-enddate') f.endDate = el.value;
    else if (el.id === 'ev-start') {
      const [oh, om] = f.start.split(':').map(Number), [eh, em] = f.end.split(':').map(Number);
      const dur = Math.max(15, (eh * 60 + em) - (oh * 60 + om));
      f.start = el.value || f.start; const [nh, nm] = f.start.split(':').map(Number); const tot = Math.min(23 * 60 + 59, nh * 60 + nm + dur);
      f.end = pad(Math.floor(tot / 60)) + ':' + pad(tot % 60); renderSheet();
    }
    else if (el.id === 'ev-end') f.end = el.value || f.end;
    else if (el.id === 'ev-cal') f.calId = el.value;
    return;
  }
  const p = ui.projectId && db.projects[ui.projectId];
  if (p) {
    if (el.id === 'proj-deadline') { upd(p, { deadline: el.value || null }); renderMain(); return; }
    if (el.id === 'proj-area') { upd(p, { areaId: el.value || null }); tasks().filter(x => x.projectId === p.id).forEach(x => upd(x, { areaId: el.value || null })); renderMain(); toast(el.value ? 'Moved to ' + areaOf(el.value).name : 'Removed from section'); return; }
    if (el.id === 'proj-name' || el.dataset.stage) { save(); renderMain(); return; }
    if (el.dataset.stageDue) { upd(p, { stages: p.stages.map(s => s.id === el.dataset.stageDue ? { ...s, due: el.value || null } : s) }); return; }
  }
  if (el.id === 'r-area') { ui.rArea = el.value; ui.rProj = ''; ui.rKey = ''; renderMain(); return; }
  if (el.id === 'r-proj') { ui.rProj = el.value; renderMain(); return; }
  if (el.id === 'r-from') { ui.rFrom = el.value; renderMain(); }
  if (el.id === 'r-to') { ui.rTo = el.value; renderMain(); }
});

/* ---------------- boot ---------------- */
window.addEventListener('online', () => { renderMain(); if (authed()) { sync(); refreshMonth(ui.month, true); } });
window.addEventListener('offline', () => renderMain());
let lastWake = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') { if (LS.get('dirty', false)) sync(); return; }
  window.__zeroInkPull();
  if (now() - lastWake < 30e3) return; lastWake = now();
  const t = today(); if (ui.sel < t && ui.sel.slice(0, 7) === t.slice(0, 7)) ui.sel = t;
  renderMain();
  if (authed()) { sync(); refreshMonth(ui.month, true); }
});
setInterval(() => { if (document.visibilityState === 'visible' && authed()) { refreshMonth(ui.month, true); if (LS.get('dirty', false)) sync(); } }, 5 * 60e3);

/* board: drag cards between columns */
document.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('.kcard'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.kid); e.dataTransfer.effectAllowed = 'move'; c.classList.add('drag'); });
document.addEventListener('dragend', e => { const c = e.target.closest && e.target.closest('.kcard'); if (c) c.classList.remove('drag'); document.querySelectorAll('.kcol.over').forEach(x => x.classList.remove('over')); });
document.addEventListener('dragover', e => { const col = e.target.closest && e.target.closest('.kcol'); if (!col) return; e.preventDefault(); document.querySelectorAll('.kcol.over').forEach(x => x !== col && x.classList.remove('over')); col.classList.add('over'); });
document.addEventListener('drop', e => { const col = e.target.closest && e.target.closest('.kcol'); if (!col) return; e.preventDefault(); const t = db.tasks[e.dataTransfer.getData('text/plain')]; if (t && kcol(t) !== col.dataset.kcol) { kmove(t, col.dataset.kcol); renderMain(); } });

/* launch links from home-screen shortcuts and the widget: ?v=view  ?a=add|event  ?t=taskId  ?d=YYYY-MM-DD */
function handleLaunch() {
  const q = new URLSearchParams(location.search);
  if (![...q.keys()].length) return;
  history.replaceState(null, '', location.pathname);
  if (!LS.get('signedIn', false)) return;
  const v = q.get('v'), a = q.get('a'), t = q.get('t'), d = q.get('d');
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) { ui.sel = d; ui.month = d.slice(0, 7); ui.view = 'home'; }
  if (v === 'repeat' || v === 'tasks') { ui.view = 'home'; ui.projectId = null; LS.set('view', 'home'); if (v === 'repeat') ui.tFilter = 'repeat'; }
  else if (v && VIEWS.includes(v) && v !== 'project') { ui.view = v; ui.projectId = null; LS.set('view', v); }
  if (a === 'add') ui.view = ui.view === 'review' || ui.view === 'notes' ? 'home' : ui.view;
  if (a === 'note') { ui.view = 'notes'; }
  renderMain();
  if (t && db.tasks[t] && !db.tasks[t].deleted) openSheet({ type: 'task', id: t });
  else if (a === 'event') openEventSheet(null, { date: ui.sel });
  else if (a === 'note') { const n = newNote(''); openNote(n.id); }
  else if (a === 'add') setTimeout(() => { const i = window.innerWidth >= 900 ? ($('#qa-d') || $('#qa-h')) : $('#qa-m'); if (i) i.focus(); }, 150);
}

renderMain(); renderSheet();
window.__zeroInkPull();
handleLaunch();
if (LS.get('signedIn', false)) { initAuth(); if (authed()) afterAuth(); else if (NATIVE) nativeAuth(false); }
else initAuth();
if (!NATIVE && 'serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
