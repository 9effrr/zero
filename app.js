'use strict';
/* Zerodocs control — personal planner. Data: Google Drive (Zero/zero-data.json). Events: Google Calendar. */

const CFG = {
  clientId: '308212712343-gge24ldmng1opr3vq44dllp3eflmm7lq.apps.googleusercontent.com',
  scopes: [
    'openid', 'email',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/tasks'
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
  pdf: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 18v-6M9.5 15.5 12 18l2.5-2.5"/></svg>',
  people: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5"/><path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 14.3c1.7.6 2.8 2.2 3.1 4.7"/></svg>',
  share: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>',
  dirLtr: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 10v5h2V4h2v11h2V4h2V2H9C6.79 2 5 3.79 5 6s1.79 4 4 4zm12 8l-4-4v3H5v2h12v3l4-4z"/></svg>',
  dirRtl: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 10v5h2V4h2v11h2V4h2V2h-8C7.79 2 6 3.79 6 6s1.79 4 4 4zm-2 7v-3l-4 4 4 4v-3h12v-2H8z"/></svg>',
  mic: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
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

/* my own data, without the shared projects (those live in their own Drive files) */
function ownDb() {
  const o = { ...db, tasks: {}, projects: {} };
  for (const k in db.tasks) if (!db.tasks[k].sh) o.tasks[k] = db.tasks[k];
  for (const k in db.projects) if (!db.projects[k].sh) o.projects[k] = db.projects[k];
  return o;
}
function persist() { LS.set('db', ownDb()); }
function save() { persist(); LS.set('dirty', true); scheduleSync(); if (typeof scheduleShSync === 'function') scheduleShSync(); }

/* tasks of shared projects show in my lists only when they are mine (assigned to me, or unassigned in a project I own);
   the project page shows all of them (allTasks) */
const shMine = t => !t.sh || (t.assignee ? t.assignee === me() : shRole(t.sh) === 'owner');
const allTasks = () => Object.values(db.tasks).filter(t => !t.deleted);
const tasks = () => Object.values(db.tasks).filter(t => !t.deleted && shMine(t));
const projects = () => Object.values(db.projects).filter(p => !p.deleted).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
const areaProjects = aid => projects().filter(p => (p.areaId || null) === (aid || null) && (!p.sh || shRole(p.sh) === 'owner'));
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
  const sp = t.projectId && db.projects[t.projectId];
  if (sp && sp.sh) { t.sh = sp.sh; t.by = me(); }
  db.tasks[t.id] = t;
  addLog('created', t);
  save();
  return t;
}
function upd(t, patch) {
  if (t && t.sh && !shCanEdit(t.sh)) { toast('This shared project is view-only for you'); return; }
  if (t && t.sh && patch.done === true) patch = { ...patch, doneBy: me() };
  Object.assign(t, patch, { updatedAt: now() }); save();
}
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
  setTimeout(() => { const j = LS.get('pendingJoin', null); if (j && authed()) { LS.del('pendingJoin'); shJoin(j); } }, 600);
  /* Gemini was removed: forget the key everywhere */
  if (db.prefs && ('geminiKey' in db.prefs || 'geminiModel' in db.prefs || 'autoTx' in db.prefs)) { const { geminiKey, geminiModel, autoTx, ...rest } = db.prefs; db.prefs = { ...rest, updatedAt: now() }; save(); }
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
  ['token', 'signedIn', 'email', 'fileId', 'folderId', 'imgFolderId', 'audFolderId', 'shared', 'shFolderId', 'pendingJoin', 'gtSince', 'gtErr', 'gtLastOk', 'db', 'cals', 'events', 'dirty', 'lastSync'].forEach(LS.del);
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
  const nf = await createFile(CFG.file, JSON.stringify(ownDb()), 'application/json', folder);
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
async function uploadBlob(name, blob, parent, mime = 'image/jpeg') {
  const bd = 'zero' + uid();
  const meta = JSON.stringify({ name, parents: [parent], mimeType: mime });
  const body = new Blob([`--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${bd}\r\nContent-Type: ${mime}\r\n\r\n`, blob, `\r\n--${bd}--`]);
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
      const txt = JSON.stringify(ownDb());
      if (txt !== remote.txt) await writeRemote(id, txt);
    }
    LS.set('dirty', false); LS.set('lastSync', now());
    setSync('ok');
    softRender();
    uploadImages(); uploadAudio(); shSyncAll();
    if (gtOn()) gtSync().then(ch => { if (ch) scheduleSync(800); });
  } catch (e) {
    console.error(e); setSync('err');
  } finally {
    syncing = false;
    if (again) { again = false; scheduleSync(300); }
  }
}

/* ---------------- Google Tasks ----------------
   Two-way with the "My Tasks" list (the one Gemini and Google Assistant add to).
   Each app task keeps gtId (Google task id), gtAt (Google's last "updated" we have seen) and
   gtPushed (the app updatedAt we last sent). Tasks that come from Google get the id g_<googleId>,
   so two devices importing the same Google task end up with one task after the Drive merge. */
const GT = 'https://tasks.googleapis.com/tasks/v1';
const GT_SCOPE = 'https://www.googleapis.com/auth/tasks';
let gtBusy = false, gtLast = 0, gtErr = LS.get('gtErr', null);
const gtOn = () => db.prefs.gtasksOn !== false; /* on unless turned off in Settings */
function gtStamp(t, gu) { t.updatedAt = now(); t.gtPushed = t.updatedAt; if (gu) t.gtAt = gu; }
function gtBody(t) {
  return {
    title: t.title || '', notes: t.notes || '',
    status: t.done ? 'completed' : 'needsAction',
    completed: t.done ? (t.doneAt || new Date().toISOString()) : null,
    due: t.due ? t.due + 'T00:00:00.000Z' : null
  };
}
const gtWants = t => !t.sh && t.updatedAt > (t.gtPushed || 0) && (t.gtId || (!t.deleted && !t.done && (t.title || '').trim()));
function gtPull(g, byG, first) {
  const gu = Date.parse(g.updated) || 0;
  let t = byG[g.id] || db.tasks['g_' + g.id];
  const gDone = g.status === 'completed';
  const gDue = g.due ? g.due.slice(0, 10) : null;
  if (g.deleted) {
    if (t && !t.deleted) { addLog('deleted', t); t.deleted = true; gtStamp(t, gu); return true; }
    return false;
  }
  if (!t) {
    const raw = (g.title || '').trim();
    if (!raw || gDone) return false; /* finished Google tasks stay in Google */
    let areaId = null;
    const title = raw.replace(/(^|\s)#(\S+)/g, (m, sp, w) => { const a = findArea(w); if (a && !areaId) { areaId = a.id; return ''; } return m; }).replace(/\s+/g, ' ').trim() || raw;
    t = {
      id: 'g_' + g.id, title, notes: g.notes || '', due: gDue, time: null, urgent: false, areaId, projectId: null, stageId: null,
      subtasks: [], links: [], images: [], repeat: null, done: false, doneAt: null, postponed: 0,
      createdAt: new Date(gu || Date.now()).toISOString(), deleted: false, gtId: g.id, fromGoogle: true
    };
    db.tasks[t.id] = t; byG[g.id] = t; addLog('created', t); gtStamp(t, gu);
    return true;
  }
  if (!t.gtId) t.gtId = g.id;
  if (gu <= (t.gtAt || 0) + 1500) return false;            /* nothing new on Google's side */
  if (t.updatedAt > (t.gtPushed || 0) && t.updatedAt > gu) return false; /* our edit is newer; the push wins */
  if (t.deleted) { t.deleted = false; }                     /* edited in Google after a delete here: keep it */
  if (g.title) { let ar = null; const tt = g.title.replace(/(^|\s)#(\S+)/g, (m, sp, w) => { const x = findArea(w); if (x && !ar) { ar = x.id; return ''; } return m; }).replace(/\s+/g, ' ').trim(); t.title = tt || g.title; if (ar && !t.projectId) t.areaId = ar; }
  t.notes = g.notes || '';
  if (gDue !== (t.due || null)) { t.due = gDue; if (!gDue) t.time = null; }
  let repush = false;
  if (gDone && !t.done) {
    const td = today();
    if (t.repeat) {
      const due = t.due || td;
      addLog('done', t, { due, late: due < td ? diffD(due, td) : 0, via: 'google' });
      t.due = nextOcc(due, t.repeat); t.subtasks = (t.subtasks || []).map(s => ({ ...s, done: false })); t.lastDoneAt = g.completed || new Date().toISOString();
      repush = true; /* reopen it in Google with the next date */
    } else {
      addLog('done', t, { late: t.due && t.due < td ? diffD(t.due, td) : 0, via: 'google' });
      t.done = true; t.doneAt = g.completed || new Date().toISOString();
    }
  } else if (!gDone && t.done) { addLog('undone', t); t.done = false; t.doneAt = null; }
  gtStamp(t, gu);
  if (repush) t.gtPushed = 0;
  return true;
}
async function gtPush(t) {
  if (!gtWants(t)) return false;
  const list = `${GT}/lists/@default/tasks`;
  const json = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
  if (t.gtId && t.deleted) {
    try { await gfetch(`${list}/${encodeURIComponent(t.gtId)}`, { method: 'DELETE' }); }
    catch (e) { if (e.status !== 404 && e.status !== 410) throw e; }
    gtStamp(t); return true;
  }
  if (t.gtId) {
    try {
      const g = await (await gfetch(`${list}/${encodeURIComponent(t.gtId)}`, { ...json, method: 'PATCH', body: JSON.stringify(gtBody(t)) })).json();
      gtStamp(t, Date.parse(g.updated)); return true;
    } catch (e) { if (e.status !== 404 && e.status !== 410) throw e; t.gtId = null; if (t.deleted || t.done) { gtStamp(t); return true; } }
  }
  const g = await (await gfetch(list, { ...json, body: JSON.stringify(gtBody(t)) })).json();
  t.gtId = g.id; gtStamp(t, Date.parse(g.updated));
  return true;
}
function gtSetErr(e) {
  const m = String((e && e.message) || e);
  gtErr = !e ? null : /SCOPE_INSUFFICIENT|insufficient.*scope|403.*scope/i.test(m) ? 'scope'
    : /SERVICE_DISABLED|accessNotConfigured|has not been used|is disabled/i.test(m) ? 'api'
    : /auth:/.test(m) ? 'auth' : 'net';
  LS.set('gtErr', gtErr);
}
async function gtSync(force) {
  if (!gtOn() || gtBusy || !authed() || !navigator.onLine) return false;
  if (!force && now() - gtLast < 20e3 && !Object.values(db.tasks).some(gtWants)) return false;
  gtBusy = true; let changed = false;
  try {
    const since = LS.get('gtSince', null);
    const startedAt = new Date(Date.now() - 120e3).toISOString();
    const byG = {}; Object.values(db.tasks).forEach(t => { if (t.gtId) byG[t.gtId] = t; });
    const items = []; let page = null;
    do {
      const q = new URLSearchParams({ maxResults: '100', showCompleted: 'true', showHidden: 'true', showDeleted: 'true' });
      if (since) q.set('updatedMin', since);
      if (page) q.set('pageToken', page);
      const j = await (await gfetch(`${GT}/lists/@default/tasks?${q}`)).json();
      items.push(...(j.items || [])); page = j.nextPageToken;
    } while (page);
    for (const g of items) if (gtPull(g, byG, !since)) changed = true;
    for (const t of Object.values(db.tasks)) if (await gtPush(t)) changed = true;
    LS.set('gtSince', startedAt); LS.set('gtLastOk', now()); gtLast = now(); gtSetErr(null);
  } catch (e) { console.warn('google tasks', e); gtSetErr(e); }
  finally { gtBusy = false; }
  if (changed) { persist(); LS.set('dirty', true); softRender(); }
  if (ui.sheet && ui.sheet.type === 'settings' && !typingInSheet()) renderSheet();
  return changed;
}
function gtStatusHTML() {
  if (!gtOn()) return 'Off';
  if (gtBusy) return 'Syncing…';
  if (gtErr === 'scope') return '<button class="pill" data-act="gt-allow">Allow access to Google Tasks</button>';
  if (gtErr === 'api') return '<span class="or">Google Tasks API is off in the app’s Google Cloud project</span>';
  if (gtErr === 'auth') return '<button class="pill" data-act="connect">Reconnect</button>';
  if (gtErr === 'net') return '<span class="or">Couldn’t reach Google Tasks</span>';
  const t = LS.get('gtLastOk', 0);
  return t ? 'Synced ' + esc(new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })) : 'Waiting…';
}

/* ---------------- voice notes ----------------
   Recordings live with the note (n.audio = [{id, at, dur, mime, local?, tx?}]), are cached on the device
   and uploaded to Drive › Zero › audio. */
let rec = null;
const fmtDur = s => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + pad(s % 60); };
const recMime = () => ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
async function recStart() {
  const n = ui.sheet && ui.sheet.type === 'note' && db.notes[ui.sheet.id]; if (!n || rec) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { toast('Recording isn’t supported on this device'); return; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (e) { console.warn(e); toast('Allow the microphone to record'); return; }
  const mime = recMime();
  let mr;
  try { mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 48000 } : {}); }
  catch { mr = new MediaRecorder(stream); }
  rec = { mr, stream, chunks: [], t0: now(), noteId: n.id, mime: (mr.mimeType || mime || 'audio/webm') };
  mr.ondataavailable = e => { if (e.data && e.data.size) rec && rec.chunks.push(e.data); };
  mr.onstop = recSave;
  mr.start(1000);
  rec.timer = setInterval(() => { const el = document.getElementById('rec-time'); if (el && rec) el.textContent = fmtDur((now() - rec.t0) / 1000); }, 500);
  richSave(); renderSheet();
}
function recStop() { if (!rec) return; try { if (rec.mr.state !== 'inactive') rec.mr.stop(); else recSave(); } catch { recSave(); } }
async function recSave() {
  const r = rec; if (!r || r.saved) return; r.saved = true; rec = null;
  clearInterval(r.timer); r.stream.getTracks().forEach(t => t.stop());
  const dur = (now() - r.t0) / 1000;
  const n = db.notes[r.noteId];
  if (!n || !r.chunks.length || dur < 0.8) { if (ui.sheet && ui.sheet.type === 'note') renderSheet(); return; }
  const blob = new Blob(r.chunks, { type: r.mime.split(';')[0] });
  const id = 'l_' + uid();
  await IDB.put(id, blob);
  n.audio = [...(n.audio || []), { id, local: true, at: now(), dur: Math.round(dur), mime: blob.type }];
  if (n.deleted) n.deleted = false;
  n.updatedAt = now(); save();
  if (ui.sheet && ui.sheet.type === 'note' && ui.sheet.id === n.id) { richSave(); renderSheet(); }
  renderMain(); uploadAudio();
}
async function audBlob(id) {
  let b = null; try { b = await IDB.get(id); } catch { }
  if (!b && !id.startsWith('l_') && authed() && navigator.onLine) { try { b = await (await gfetch(`${DRV}/files/${id}?alt=media`)).blob(); IDB.put(id, b).catch(() => { }); } catch (e) { console.warn(e); } }
  return b;
}
function hydrateAud(root = document) {
  root.querySelectorAll('audio[data-aud]').forEach(async el => {
    if (el.dataset.done) return; el.dataset.done = '1';
    const id = el.dataset.aud;
    if (!imgURL[id]) { const b = await audBlob(id); if (b) imgURL[id] = URL.createObjectURL(b); }
    if (imgURL[id]) el.src = imgURL[id]; else { const c = el.closest('.vclip'); if (c) c.classList.add('missing'); }
  });
}
async function ensureAudFolder() {
  let id = LS.get('audFolderId', null); if (id) return id;
  const parent = await ensureFolder();
  const f = await findOne(`name='audio' and '${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  if (f) id = f.id;
  else {
    const r = await gfetch(`${DRV}/files?fields=id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'audio', parents: [parent], mimeType: 'application/vnd.google-apps.folder' }) });
    id = (await r.json()).id;
  }
  LS.set('audFolderId', id); return id;
}
let uploadingAud = false;
async function uploadAudio() {
  if (uploadingAud || !authed() || !navigator.onLine) return;
  const pending = notes().filter(n => (n.audio || []).some(a => a.local));
  if (!pending.length) return;
  uploadingAud = true;
  try {
    const folder = await ensureAudFolder();
    for (const n of pending) for (const a of [...(n.audio || [])]) {
      if (!a.local) continue;
      const b = await IDB.get(a.id); if (!b) continue;
      const ext = /mp4|aac/.test(b.type) ? 'm4a' : /ogg/.test(b.type) ? 'ogg' : 'webm';
      const id = await uploadBlob(`${(n.title || 'voice note').slice(0, 40)} ${new Date(a.at).toISOString().slice(0, 16).replace('T', ' ')}.${ext}`, b, folder, b.type || 'audio/webm');
      await IDB.put(id, b);
      if (imgURL[a.id]) imgURL[id] = imgURL[a.id];
      const cur = db.notes[n.id];
      cur.audio = (cur.audio || []).map(x => x.id === a.id ? { ...x, id, local: false } : x); cur.updatedAt = now();
      IDB.del(a.id); save();
    }
    if (ui.sheet && ui.sheet.type === 'note' && !typingInSheet()) { richSave(); renderSheet(); }
  } catch (e) { console.error(e); }
  finally { uploadingAud = false; }
}
function removeClip(n, id) {
  n.audio = (n.audio || []).filter(x => x.id !== id); n.updatedAt = now(); save();
  if (id.startsWith('l_')) IDB.del(id);
  else if (authed() && navigator.onLine) gfetch(`${DRV}/files/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) }).catch(() => { });
}
/* recordings are turned into mono WAV for sharing, so they play on every phone and computer */
function wavEncode(f32, rate) {
  const n = f32.length, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
  const w = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) { const x = Math.max(-1, Math.min(1, f32[i])); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
  return new Blob([b], { type: 'audio/wav' });
}
async function audioToWavParts(blob, maxSec = 300, rate = 16000) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC();
  let dec;
  try { dec = await ac.decodeAudioData(await blob.arrayBuffer()); } finally { try { ac.close(); } catch { } }
  const len = Math.max(1, Math.ceil(dec.duration * rate));
  const off = new OfflineAudioContext(1, len, rate);
  const src = off.createBufferSource(); src.buffer = dec; src.connect(off.destination); src.start();
  const pcm = (await off.startRendering()).getChannelData(0);
  const per = maxSec * rate, parts = [];
  for (let i = 0; i < pcm.length; i += per) parts.push(wavEncode(pcm.subarray(i, Math.min(pcm.length, i + per)), rate));
  return parts;
}
const b64 = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(blob); });
/* ---------------- sharing ---------------- */
const shareName = t => (String(t || '').trim() || 'Voice note').replace(/[\\/:*?"<>|\n\r]+/g, ' ').slice(0, 60).trim();
async function shareNote(n) {
  if (ui.sheet && ui.sheet.type === 'note' && ui.sheet.id === n.id) richSave();
  const title = (n.title || '').trim();
  const text = [title, (n.text || '').trim()].filter(Boolean).join('\n\n');
  if (!text && !(n.audio || []).length) { toast('Nothing to share yet'); return; }
  if (!text) { shareClip(n, n.audio[0].id); return; }
  if (NATIVE && ZeroNative.shareText) { try { ZeroNative.shareText(title || 'Note', text); return; } catch { } }
  if (navigator.share) { try { await navigator.share({ title: title || 'Note', text }); } catch (e) { if (e && e.name !== 'AbortError') copyNote(text); } return; }
  copyNote(text);
}
async function copyNote(text) {
  try { await navigator.clipboard.writeText(text); toast('Note copied — paste it anywhere'); }
  catch { toast('Couldn’t share this note here'); }
}
/* recordings are shared as WAV so they play everywhere (WhatsApp, iPhone, Mac…) */
async function shareClip(n, id) {
  const b = await audBlob(id); if (!b) { toast('This recording isn’t on this device yet — try again online'); return; }
  let f = b;
  try { f = (await audioToWavParts(b, 36000, 22050))[0]; } catch (e) { console.warn('wav', e); }
  const ext = f.type === 'audio/wav' ? 'wav' : /mp4|aac/.test(f.type) ? 'm4a' : /ogg/.test(f.type) ? 'ogg' : 'webm';
  const name = shareName(n.title) + '.' + ext;
  if (NATIVE && ZeroNative.shareFile) { try { ZeroNative.shareFile(name, f.type || 'audio/*', await b64(f)); return; } catch (e) { console.warn(e); } }
  const file = new File([f], name, { type: f.type || 'audio/wav' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: shareName(n.title) }); } catch (e) { if (e && e.name !== 'AbortError') dlFile(file); } return; }
  dlFile(file);
}
function dlFile(file) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  toast('Saved to Downloads — share it from there');
}
function voiceHTML(n) {
  const recHere = rec && rec.noteId === n.id;
  const clips = n.audio || [];
  if (!clips.length && !recHere) return '';
  return `<div class="vlist">${recHere ? `<div class="vrec"><span class="vdot"></span><span>Recording</span><span class="num" id="rec-time">${fmtDur((now() - rec.t0) / 1000)}</span><button class="pill" data-act="rec-stop">Stop</button></div>` : ''}
    ${clips.map(c => `<div class="vclip"><audio data-aud="${esc(c.id)}" controls preload="metadata"></audio>
      <div class="vmeta"><span class="mut num">${fmtDur(c.dur)} · ${esc(new Date(c.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}${c.local ? ' · saved on this device' : ''}</span>
      <span class="vact"><button class="ib" data-act="rec-share" data-id="${esc(c.id)}" aria-label="Share recording" title="Share">${I.share}</button><button class="ib" data-act="rec-del" data-id="${esc(c.id)}" aria-label="Delete recording">${I.trash}</button></span></div></div>`).join('')}</div>`;
}

/* ---------------- shared projects (Google Drive) ----------------
   A shared project lives in its own file in the owner's Drive (Zero › shared › "<name> · Ctrl Z.json"),
   shared with each member through Google Drive. Every member's app reads and writes that file about once
   a minute and merges it record by record (newest edit wins), so people working on different tasks never
   overwrite each other. In memory the project and its tasks sit in db.projects / db.tasks with sh = fileId,
   so every screen works on them as usual; they are kept out of each person's own data file. */
const APP_NUM = '308212712343';                 /* Google Cloud project number (Picker needs it) */
const PICKER_KEY = '';                          /* browser API key for Google Picker, used when joining */
const JOIN_BASE = 'https://9effrr.github.io/zero/';
let SH = LS.get('shared', {});                  /* fileId -> { fileId, data, at, lost } */
let shBusy = false, shTimer = null;
const me = () => (LS.get('email', '') || '').toLowerCase();
const shIds = () => Object.keys(SH);
function shPersist() { try { LS.set('shared', SH); } catch { } }
const shStrip = r => { const { sh, gtId, gtAt, gtPushed, ...o } = r; return o; };
function shRole(fid) {
  const d = SH[fid] && SH[fid].data; if (!d) return 'writer';
  if ((d.owner || '').toLowerCase() === me()) return 'owner';
  const m = d.members && d.members[me()];
  if (m && !m.removed) return m.role === 'reader' ? 'reader' : 'writer';
  if (d.link && d.link.role) return d.link.role === 'reader' ? 'reader' : 'writer'; /* came in through the open link */
  return 'writer';
}
/* "anyone with the link": Google Drive permission of type anyone (not searchable) */
async function shSetLink(fid, role) {
  const s = SH[fid]; if (!s || !s.data) return;
  const cur = s.data.link || {};
  if (cur.pid) { try { await gfetch(`${DRV}/files/${encodeURIComponent(fid)}/permissions/${encodeURIComponent(cur.pid)}`, { method: 'DELETE' }); } catch (e) { if (e.status !== 404) throw e; } }
  let pid = null;
  if (role) {
    const r = await gfetch(`${DRV}/files/${encodeURIComponent(fid)}/permissions?fields=id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'anyone', role: role === 'reader' ? 'reader' : 'writer', allowFileDiscovery: false }) });
    pid = (await r.json()).id || null;
  }
  s.data.link = { role: role || null, pid, updatedAt: now() };
  shPersist();
  /* write the new link setting straight away (the merge below keeps it) */
  await gfetch(`${UPL}/files/${encodeURIComponent(fid)}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...s.data, updatedAt: now() }) });
  await shSyncOne(fid);
}
const shCanEdit = fid => shRole(fid) !== 'reader';
function shMembers(fid) {
  const d = SH[fid] && SH[fid].data; if (!d) return [];
  return Object.values(d.members || {}).filter(m => !m.removed).sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : (a.name || a.email).localeCompare(b.name || b.email)));
}
function shName(fid, email) {
  if (!email) return '';
  if (email.toLowerCase() === me()) return 'You';
  const m = SH[fid] && SH[fid].data && SH[fid].data.members && SH[fid].data.members[email.toLowerCase()];
  return (m && m.name) || email.split('@')[0];
}
function initials(s) {
  const w = String(s || '?').replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase();
}
const AV_COLORS = ['#9CC2A4', '#D9B48F', '#93AFC2', '#B7A4D0', '#E39A86', '#C9B98A', '#8FB8B8'];
function avatar(fid, email, cls = '') {
  const n = shName(fid, email); let h = 0; for (const c of email || '') h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `<span class="av ${cls}" style="background:${AV_COLORS[h % AV_COLORS.length]}" title="${esc(n)}" aria-label="${esc(n)}">${esc(initials(shName(fid, email) === 'You' ? email : n))}</span>`;
}
/* put a file's project + tasks into db, keeping any newer local edit */
function shInject(fid, force) {
  const s = SH[fid]; if (!s || !s.data || !s.data.project) return;
  const keep = (loc, rem) => (!force && loc && loc.sh === fid && (loc.updatedAt || 0) >= (rem.updatedAt || 0)) ? loc : { ...rem, sh: fid };
  const p = s.data.project;
  db.projects[p.id] = keep(db.projects[p.id], p);
  for (const t of Object.values(s.data.tasks || {})) db.tasks[t.id] = keep(db.tasks[t.id], t);
}
function shRemoveLocal(fid) {
  for (const k in db.tasks) if (db.tasks[k].sh === fid) delete db.tasks[k];
  for (const k in db.projects) if (db.projects[k].sh === fid) delete db.projects[k];
}
function shProject(fid) { const d = SH[fid] && SH[fid].data; return d && d.project ? db.projects[d.project.id] : null; }
/* the parts of db that belong to this file, as they are on this device now */
function shCollect(fid) {
  const d = SH[fid].data; const pid = d.project.id;
  const p = db.projects[pid];
  const tasksOut = {};
  for (const t of Object.values(db.tasks)) {
    if (t.sh === fid) tasksOut[t.id] = shStrip(t);
    else if (!t.sh && t.projectId === pid) { t.sh = fid; t.by = t.by || me(); tasksOut[t.id] = shStrip(t); } /* added here since the last sync */
  }
  return { project: p ? shStrip(p) : d.project, tasks: tasksOut };
}
const newer = (a, b) => (!a ? b : !b ? a : (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a);
async function shSyncOne(fid) {
  const s = SH[fid]; if (!s) return false;
  let remote;
  try { remote = await (await gfetch(`${DRV}/files/${encodeURIComponent(fid)}?alt=media`)).json(); }
  catch (e) {
    if (e.status === 404 || e.status === 403) { s.lost = true; shPersist(); return false; } /* removed, or access taken away */
    throw e;
  }
  if (!remote || remote.kind !== 'ctrlz-shared') return false;
  s.lost = false;
  if (!s.data) { s.data = remote; shInject(fid, true); }
  const reader = shRole(fid) === 'reader';
  if (reader) { s.data = remote; shInject(fid, true); s.at = now(); shPersist(); return true; }
  const loc = shCollect(fid);
  const merged = {
    ...remote,
    project: newer(remote.project, loc.project),
    tasks: mergeMap(remote.tasks, loc.tasks),
    members: mergeMap(remote.members, (s.data && s.data.members) || {}),
    link: newer(remote.link, s.data && s.data.link) || null
  };
  if (!merged.link) delete merged.link;
  const changed = JSON.stringify(merged) !== JSON.stringify(remote);
  s.data = merged; shInject(fid);
  if (changed) {
    merged.updatedAt = now();
    await gfetch(`${UPL}/files/${encodeURIComponent(fid)}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(merged) });
  }
  s.at = now(); shPersist();
  return true;
}
async function shSyncAll() {
  if (shBusy || !authed() || !navigator.onLine) return;
  /* projects joined on another of my devices */
  for (const fid of (db.prefs.sharedFiles || [])) if (!SH[fid]) SH[fid] = { fileId: fid, data: null, at: 0 };
  for (const fid of shIds()) if (!(db.prefs.sharedFiles || []).includes(fid) && SH[fid].left) { delete SH[fid]; }
  if (!shIds().length) return;
  shBusy = true;
  try { for (const fid of shIds()) { try { await shSyncOne(fid); } catch (e) { console.warn('shared', fid, e); } } }
  finally { shBusy = false; shPersist(); }
  if (!typingInSheet()) { renderMain(); if (ui.sheet && (ui.sheet.type === 'share')) renderSheet(); }
}
function scheduleShSync(ms = 2500) { if (!shIds().length) return; clearTimeout(shTimer); shTimer = setTimeout(shSyncAll, ms); }
async function ensureSharedFolder() {
  let id = LS.get('shFolderId', null); if (id) return id;
  const parent = await ensureFolder();
  const f = await findOne(`name='shared' and '${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  if (f) id = f.id;
  else id = (await (await gfetch(`${DRV}/files?fields=id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'shared', parents: [parent], mimeType: 'application/vnd.google-apps.folder' }) })).json()).id;
  LS.set('shFolderId', id); return id;
}
function addSharedPref(fid) { const l = db.prefs.sharedFiles || []; if (!l.includes(fid)) { db.prefs = { ...db.prefs, sharedFiles: [...l, fid], updatedAt: now() }; save(); } }
function dropSharedPref(fid) { db.prefs = { ...db.prefs, sharedFiles: (db.prefs.sharedFiles || []).filter(x => x !== fid), updatedAt: now() }; save(); }
/* turn one of my projects into a shared one: it moves (with new ids) into its own Drive file */
async function shCreate(p) {
  const ts = allTasks().filter(t => t.projectId === p.id);
  const at = now();
  const np = { ...shStrip(p), id: 'sp' + uid(), updatedAt: at };
  const tasksOut = {};
  for (const t of ts) { const nt = { ...shStrip(t), id: 'st' + uid(), projectId: np.id, by: t.by || me(), updatedAt: at }; tasksOut[nt.id] = nt; }
  const data = { kind: 'ctrlz-shared', v: 1, owner: me(), createdAt: new Date().toISOString(), updatedAt: at, project: np, tasks: tasksOut,
    members: { [me()]: { email: me(), name: '', role: 'owner', updatedAt: at } } };
  const folder = await ensureSharedFolder();
  const f = await createFile(`${(p.name || 'Project').slice(0, 60)} · Ctrl Z.json`, JSON.stringify(data), 'application/json', folder);
  if (!f || !f.id) throw new Error('create failed');
  ts.forEach(t => { t.deleted = true; t.updatedAt = now(); });
  p.deleted = true; p.updatedAt = now();
  SH[f.id] = { fileId: f.id, data, at: now() }; shPersist();
  addSharedPref(f.id);
  shInject(f.id, true);
  save();
  return { fid: f.id, project: db.projects[np.id] };
}
async function shAddMember(fid, email, name, role) {
  const s = SH[fid]; const p = shProject(fid); if (!s || !p) return;
  email = email.trim().toLowerCase();
  const msg = `${me()} added you to “${p.name}” in Ctrl Z. Open it here: ${JOIN_BASE}?join=${fid}`;
  const r = await gfetch(`${DRV}/files/${encodeURIComponent(fid)}/permissions?sendNotificationEmail=true&fields=id&emailMessage=${encodeURIComponent(msg)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'user', role: role === 'reader' ? 'reader' : 'writer', emailAddress: email })
  });
  const pm = await r.json();
  s.data.members = { ...(s.data.members || {}), [email]: { email, name: (name || '').trim(), role: role === 'reader' ? 'reader' : 'writer', pid: pm.id || null, updatedAt: now() } };
  shPersist();
  await shSyncOne(fid);
}
async function shRemoveMember(fid, email) {
  const s = SH[fid]; const m = s && s.data.members && s.data.members[email]; if (!m) return;
  if (m.pid) { try { await gfetch(`${DRV}/files/${encodeURIComponent(fid)}/permissions/${encodeURIComponent(m.pid)}`, { method: 'DELETE' }); } catch (e) { if (e.status !== 404) throw e; } }
  s.data.members[email] = { ...m, removed: true, updatedAt: now() };
  allTasks().filter(t => t.sh === fid && t.assignee === email).forEach(t => upd(t, { assignee: null }));
  shPersist(); await shSyncOne(fid);
}
function shLeave(fid) {
  const s = SH[fid]; if (!s) return;
  s.left = true; shRemoveLocal(fid); delete SH[fid]; shPersist(); dropSharedPref(fid);
}
/* joining: the link ?join=<fileId>. Google only lets this app open a file shared with you after you pick it once */
async function shJoin(fid) {
  if (!fid) return;
  fid = String(fid).trim().replace(/^.*[?&]join=/, '').replace(/[^\w-].*$/, '');
  if (SH[fid] && SH[fid].data) { const p = shProject(fid); if (p) openProject(p.id); return; }
  try {
    const d = await (await gfetch(`${DRV}/files/${encodeURIComponent(fid)}?alt=media`)).json();
    if (!d || d.kind !== 'ctrlz-shared') { toast('That link isn’t a Ctrl Z project'); return; }
    SH[fid] = { fileId: fid, data: d, at: now() }; shPersist(); addSharedPref(fid); shInject(fid, true);
    if (!(d.members || {})[me()] && shRole(fid) === 'writer' && me()) {
      d.members = { ...(d.members || {}), [me()]: { email: me(), name: '', role: 'writer', viaLink: true, updatedAt: now() } };
      shSyncOne(fid).catch(() => { });
    }
    toast('Joined “' + d.project.name + '”'); openProject(d.project.id);
  } catch (e) {
    if (e.status === 404 || e.status === 403) { ui.joinFid = fid; openSheet({ type: 'join' }); return; }
    toast('Couldn’t open the shared project — try again'); console.warn(e);
  }
}
function loadPicker() {
  return new Promise((res, rej) => {
    if (window.google && google.picker) return res();
    const go = () => gapi.load('picker', { callback: res, onerror: rej });
    if (window.gapi) return go();
    const s = document.createElement('script'); s.src = 'https://apis.google.com/js/api.js'; s.onload = go; s.onerror = rej; document.head.appendChild(s);
  });
}
async function pickShared(fid) {
  try { await loadPicker(); } catch { toast('Couldn’t load Google’s file picker'); return; }
  const tk = await getToken();
  const view = new google.picker.DocsView(google.picker.ViewId.DOCS).setMode(google.picker.DocsViewMode.LIST).setIncludeFolders(false).setOwnedByMe(false);
  if (fid && view.setFileIds) view.setFileIds(fid);
  const b = new google.picker.PickerBuilder().addView(view).setOAuthToken(tk).setAppId(APP_NUM).setTitle('Choose the shared Ctrl Z project')
    .setCallback(async d => {
      if (d.action !== google.picker.Action.PICKED || !d.docs || !d.docs[0]) return;
      closeSheetQuiet(); await shJoin(d.docs[0].id);
    });
  if (PICKER_KEY) b.setDeveloperKey(PICKER_KEY);
  try { b.setOrigin(location.origin); } catch { }
  b.build().setVisible(true);
}
function joinSheet() {
  return `<div class="sheet-top"><button class="ib" data-act="close-sheet" aria-label="Close">${I.l}</button><span class="crumb">Shared project</span><span style="width:40px"></span></div>
  <h2 style="margin:6px 2px 8px;font-size:22px">Open the project you were invited to</h2>
  <p class="mut" style="font-size:14px;line-height:1.7;margin:0 2px 18px">Google asks you to choose the shared file once, so Ctrl Z can open it. Tap the button, pick the project (it ends in “· Ctrl Z”) and press Select.</p>
  <button class="btn pri full" data-act="sh-pick">Choose the shared project</button>
  ${NATIVE ? `<p class="mut" style="font-size:12px;margin:12px 2px 0;line-height:1.6">If the chooser doesn’t open here, open the invite link in Chrome once — the project then appears in this app too.</p>` : ''}`;
}
function shareSheet() {
  const p = db.projects[ui.projectId]; if (!p) return '';
  const fid = p.sh; const owner = fid && shRole(fid) === 'owner';
  const top = `<div class="sheet-top"><button class="ib" data-act="close-sheet" aria-label="Close">${I.l}</button><span class="crumb" dir="auto">${esc(p.name)}</span><span style="width:40px"></span></div>`;
  if (!fid) return top + `<h2 style="margin:6px 2px 8px;font-size:22px">Work on this project with others</h2>
    <p class="mut" style="font-size:14px;line-height:1.7;margin:0 2px 16px">The project and its tasks move into a shared file in your Google Drive. Each person signs in with their own Google account and sees only the projects shared with them. Changes show up for everyone within about a minute.</p>
    <button class="btn pri full" data-act="sh-start">Share this project</button>`;
  const ms = shMembers(fid);
  const link = `${JOIN_BASE}?join=${fid}`;
  return top + `${sec('People', `<div class="card">${ms.map(m => `<div class="mrow">${avatar(fid, m.email)}<span class="mtx"><b dir="auto">${esc(m.name || m.email.split('@')[0])}${m.email === me() ? ' (you)' : ''}</b><span class="mut">${esc(m.email)}</span></span><span class="mrole">${m.role === 'owner' ? 'Owner' : m.role === 'reader' ? 'Can view' : 'Can edit'}</span>${owner && m.role !== 'owner' ? `<button class="ib" data-act="sh-rm" data-email="${esc(m.email)}" aria-label="Remove ${esc(m.email)}">${I.x || '×'}</button>` : ''}</div>`).join('')}</div>`, { right: `<span class="mut">${ms.length}</span>` })}
  ${owner ? sec('Add someone', `<form class="card shadd" data-form="sh-add" autocomplete="off">
      <div class="field"><label for="sh-email">Gmail</label><input id="sh-email" name="email" type="email" inputmode="email" placeholder="name@gmail.com" required></div>
      <div class="field"><label for="sh-name">Name</label><input id="sh-name" name="name" dir="auto" placeholder="Optional"></div>
      <div class="field"><label for="sh-role">Can</label><select id="sh-role" name="role"><option value="writer">Edit</option><option value="reader">View only</option></select></div>
      <button class="btn pri full" type="submit" style="margin-top:6px">Add and send invite</button></form>
      <p class="mut" style="font-size:12px;margin:8px 2px 0;line-height:1.6">Google emails them the invite. They open the link, sign in with that Gmail, and the project appears in their app.</p>`) : ''}
  ${owner ? sec('Link access', `<div class="lacc" role="radiogroup" aria-label="Who can open the link">${[['', 'Only people added', 'The link works only for the people above'], ['reader', 'Anyone with the link · View', 'Anyone who opens it with a Google account can see the project'], ['writer', 'Anyone with the link · Edit', 'Anyone who opens it can add and tick tasks']].map(([v, l, d]) => `<button class="lopt ${((SH[fid].data.link || {}).role || '') === v ? 'on' : ''}" data-act="sh-link" data-v="${v}" role="radio" aria-checked="${((SH[fid].data.link || {}).role || '') === v}"><span class="dot"></span><span><b>${l}</b><em>${d}</em></span></button>`).join('')}</div>`) : ''}
  ${sec('Invite link', `<div class="card" style="padding:12px 14px"><div class="mut" style="font-size:12px;word-break:break-all;direction:ltr">${esc(link)}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px"><button class="btn" data-act="sh-copy">Copy link</button><button class="btn" data-act="sh-send">Send…</button></div></div>
    <p class="mut" style="font-size:12px;margin:8px 2px 0">${(SH[fid].data.link || {}).role ? 'Anyone you send it to can open it. Switch Link access back to “Only people added” to stop it.' : 'Only people added above can open it.'}</p>`)}
  ${owner ? '' : `<button class="btn full" style="margin-top:18px" data-act="sh-leave">Leave this project</button>`}`;
}
function sharedView() {
  const ps = shIds().map(shProject).filter(p => p && !p.deleted);
  return `<div class="hdr"><h1>Shared</h1></div>
  ${ps.length ? `<div class="plist">${ps.map(pcardHTML).join('')}</div>` : `<p class="mut" style="font-size:14px;line-height:1.7">Projects other people share with you appear here.</p>`}
  ${sec('Join with a link', `<form class="inline-add" data-form="sh-join" autocomplete="off">${I.plusS}<input id="sh-join" name="v" dir="ltr" placeholder="Paste the invite link" enterkeyhint="go"><button class="go-s" type="submit">Open</button></form>`)}`;
}

/* ---------------- project PDF (brief + to-do list, white, for printing) ---------------- */
const txtDir = s => { const m = String(s || '').match(/[A-Za-z\u00C0-\u024F]|[\u0590-\u08FF\uFB1D-\uFEFC]/); return m && /[\u0590-\u08FF\uFB1D-\uFEFC]/.test(m[0]) ? 'rtl' : 'ltr'; };
function projectPdfHTML(p) {
  const ts = allTasks().filter(t => t.projectId === p.id);
  const s = projStats(p); const a = areaOf(p.areaId);
  const fid = p.sh;
  const day = d => d ? pd(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const prio = (PRIO.find(x => x[0] === (p.priority || 0)) || [0, ''])[1];
  const meta = [a ? a.name : '', p.priority ? prio : '', p.deadline ? 'Deadline ' + day(p.deadline) : '', fid ? shMembers(fid).map(m => m.name || m.email.split('@')[0]).join(', ') : ''].filter(Boolean);
  const row = t => {
    const bits = [];
    if (t.due) bits.push(`<span class="${isOverdue(t) ? 'late' : ''}">${esc(day(t.due))}${t.time ? ' ' + esc(t.time) : ''}</span>`);
    if (t.urgent && !t.done) bits.push('<span class="late">Urgent</span>');
    if (fid && t.assignee) { const m = (SH[fid].data.members || {})[t.assignee]; bits.push(esc((m && m.name) || t.assignee.split('@')[0])); }
    const subs = (t.subtasks || []).map(x => `<li dir="${txtDir(x.title)}" class="${x.done ? 'done' : ''}"><i class="bx">${x.done ? '✓' : ''}</i><span dir="auto">${esc(x.title || '')}</span></li>`).join('');
    return `<li dir="${txtDir(t.title)}" class="${t.done ? 'done' : ''}"><i class="bx">${t.done ? '✓' : ''}</i><span class="t" dir="auto">${esc(t.title || 'Untitled')}</span>${bits.length ? `<span class="m">${bits.join(' · ')}</span>` : ''}${subs ? `<ul class="subs">${subs}</ul>` : ''}</li>`;
  };
  const sortT = l => [...l.filter(t => !t.done).sort(byDue), ...l.filter(t => t.done)];
  const stages = (p.stages || []).map(st => {
    const l = ts.filter(t => t.stageId === st.id); const dn = l.filter(t => t.done).length;
    return `<section class="stage" dir="${txtDir(st.name)}"><h2>${esc(st.name)}</h2><p class="sm">${[st.start || st.due ? `${day(st.start)}${st.start && st.due ? ' → ' : ''}${day(st.due)}` : '', `${dn} of ${l.length} done`].filter(Boolean).join(' · ')}</p>
      <ul class="todo">${sortT(l).map(row).join('') || '<li class="none">No tasks yet</li>'}</ul></section>`;
  }).join('');
  const other = ts.filter(t => !t.stageId || !(p.stages || []).some(x => x.id === t.stageId));
  const otherHTML = other.length ? `<section class="stage"><h2>${(p.stages || []).length ? 'Other tasks' : 'Tasks'}</h2><ul class="todo">${sortT(other).map(row).join('')}</ul></section>` : '';
  const exported = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(p.name)}</title><style>
  @page{size:A4;margin:18mm 17mm 20mm}
  *{box-sizing:border-box}
  html,body{margin:0;background:#fff;color:#1d2230;font:13px/1.55 -apple-system,"Segoe UI",Roboto,"Noto Sans","Noto Sans Arabic",Tahoma,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .kick{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#9a7a5c;margin:0 0 10px}
  h1{font-size:30px;line-height:1.2;margin:0 0 8px;font-weight:700;color:#141824}
  .meta{color:#6b7280;font-size:12.5px;margin:0 0 22px}
  .brief{font-size:16px;line-height:1.7;color:#2a3040;margin:0 0 24px;white-space:pre-wrap}
  .prog{display:flex;align-items:center;gap:14px;margin:0 0 30px;color:#4b5563;font-size:12.5px}
  .bar{flex:1;height:6px;border-radius:3px;background:#efe9e2;overflow:hidden}.bar i{display:block;height:100%;background:#c29b78;border-radius:3px}
  .stage{margin:0 0 26px;break-inside:auto}
  h2{font-size:17px;margin:0 0 2px;color:#141824}
  .sm{color:#8b93a1;font-size:11.5px;margin:0 0 10px}
  ul.todo,ul.subs{list-style:none;margin:0;padding:0}
  ul.todo>li{display:grid;grid-template-columns:20px 1fr auto;column-gap:10px;align-items:start;padding:7px 0;break-inside:avoid}
  .bx{width:15px;height:15px;border:1.5px solid #b9a58f;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-style:normal;font-size:11px;line-height:1;color:#fff;margin-top:2px}
  li.done>.bx{background:#9cc2a4;border-color:#9cc2a4}
  li.done>.t{color:#9aa1ad;text-decoration:line-through}
  .t{font-size:13.5px;color:#1d2230}
  .m{color:#6b7280;font-size:11.5px;white-space:nowrap;padding-top:2px;direction:ltr;unicode-bidi:isolate}
  .sm,.meta,.prog{unicode-bidi:isolate}
  .sm{direction:ltr;text-align:start}
  [dir=rtl] .sm{text-align:right}
  [dir=rtl] .meta{text-align:right}
  .late{color:#c2410c}
  ul.subs{grid-column:2/4;margin-top:4px}
  ul.subs li{display:flex;gap:8px;align-items:center;font-size:12px;color:#4b5563;padding:2px 0}
  ul.subs .bx{width:12px;height:12px;font-size:9px;margin:0}
  ul.subs li.done .bx{background:#9cc2a4;border-color:#9cc2a4}
  ul.subs li.done span{text-decoration:line-through;color:#9aa1ad}
  li.none{color:#9aa1ad;font-size:12px;display:block!important}
  .foot{margin-top:34px;color:#a0a7b3;font-size:10.5px}
  </style></head><body>
  <div dir="${txtDir(p.name)}"><p class="kick">Project brief</p>
  <h1 dir="auto">${esc(p.name)}</h1>
  ${meta.length ? `<p class="meta" dir="auto">${meta.map(esc).join(' · ')}</p>` : ''}
  ${(p.brief || '').trim() ? `<p class="brief" dir="auto">${esc(p.brief.trim())}</p>` : ''}
  </div><div class="prog"><span>${s.done} of ${s.total} tasks done</span><span class="bar"><i style="width:${s.pct}%"></i></span><span>${s.pct}%</span></div>
  ${stages}${otherHTML}
  ${!ts.length ? '<p class="sm">No tasks yet.</p>' : ''}
  <p class="foot">Exported from Ctrl Z · ${esc(exported)}</p>
  </body></html>`;
}
function exportProjectPdf(p) {
  const html = projectPdfHTML(p);
  if (NATIVE && ZeroNative.printHtml) { try { ZeroNative.printHtml(p.name || 'Project', html); return; } catch (e) { console.warn(e); } }
  const f = document.createElement('iframe');
  f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(f);
  f.onload = () => {
    try { f.contentWindow.focus(); f.contentWindow.print(); }
    catch { const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); } }
    setTimeout(() => f.remove(), 60000);
  };
  f.srcdoc = html;
  toast('Choose “Save as PDF” to keep the file');
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
const VIEWS = ['home', 'notes', ...AREAS.map(a => a.id), 'shared', 'review', 'project'];
const TABS = [['home', 'Home'], ['notes', 'Notes'], ...AREAS.map(a => [a.id, a.name]), ['review', 'Review']];
const hasShared = () => shIds().some(f => { const p = shProject(f); return p && !p.deleted && shRole(f) !== 'owner'; }) || shIds().length > 0;
const tabsNow = () => hasShared() ? [...TABS.slice(0, -1), ['shared', 'Shared'], TABS[TABS.length - 1]] : TABS;
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
  if (t.sh && t.assignee) m.push(`<span class="who">${avatar(t.sh, t.assignee, 'sm')}${esc(shName(t.sh, t.assignee))}</span>`);
  if (t.sh && t.done && t.doneBy && t.doneBy !== me()) m.push(`<span class="who">✓ ${esc(shName(t.sh, t.doneBy))}</span>`);
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
  const ts = allTasks().filter(t => t.projectId === p.id);
  const done = ts.filter(t => t.done).length;
  const overdue = ts.filter(isOverdue).length;
  return { total: ts.length, done, open: ts.length - done, overdue, pct: ts.length ? Math.round(done / ts.length * 100) : 0 };
}
function pcardHTML(p) {
  const s = projStats(p); const a = areaOf(p.areaId);
  const pr = p.done ? 0 : (p.priority || 0);
  return `<button class="card pcard ${p.done ? 'pdone' : ''} prio-${pr}" data-act="open-project" data-id="${esc(p.id)}" style="${a ? '--ac:' + a.color : ''}">${pr ? `<span class="pbadge">${pr === 2 ? 'Top priority' : 'Important'}</span>` : ''}
    <span style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><span class="nm" dir="auto">${p.done ? `<span class="pdk">${I.check}</span>` : ''}${esc(p.name)}</span><span class="mut" style="font-size:12px;white-space:nowrap">${p.done ? 'Completed ' + esc(shortDay(isoDay(p.doneAt || new Date().toISOString()))) : p.deadline ? 'Due ' + esc(shortDay(p.deadline)) : ''}</span></span>
    ${p.brief ? `<span class="pcbrief" dir="auto">${esc(p.brief)}</span>` : ''}
    ${p.sh ? `<span class="pcshared"><span class="avs">${shMembers(p.sh).slice(0, 6).map(m => avatar(p.sh, m.email, 'sm')).join('')}</span><span class="mut">Shared${shRole(p.sh) !== 'owner' && SH[p.sh].data ? ' by ' + esc(shName(p.sh, SH[p.sh].data.owner)) : ''}</span></span>` : ''}
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
function curTab() { if (ui.view !== 'project') return ui.view; const p = db.projects[ui.projectId] || {}; return p.sh && shRole(p.sh) !== 'owner' ? 'shared' : (p.areaId || 'home'); }
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
    ${hasShared() ? nav('shared', 'Shared', c(shIds().length)) : ''}
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
  return `<nav class="bottom" aria-label="Main">${qaHTML('qa-m')}<div class="tabs" id="tabs">${tabsNow().map(tab).join('')}</div></nav>`;
}
function bannerHTML() {
  if (!navigator.onLine) return `<div class="card" style="padding:10px 14px;margin-bottom:14px;font-size:13px;color:var(--mut)">Offline — your changes are saved on this device and will sync when you're back online.</div>`;
  if (!authed()) return `<div class="card" style="padding:8px 8px 8px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px"><span class="mut">Google session paused.</span><button class="pill" data-act="connect">Reconnect</button></div>`;
  if (gtOn() && gtErr === 'scope') return `<div class="card" style="padding:8px 8px 8px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px"><span class="mut">Allow Google Tasks once on this device to sync your tasks.</span><button class="pill" data-act="gt-allow">Allow</button></div>`;
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
  document.querySelectorAll('.pbrief').forEach(el => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; });
}
/* true while the cursor is in a field of an open sheet or note (including the note's rich text) */
function typingInSheet() {
  const a = document.activeElement;
  return !!(a && a.closest && a.closest('.sheet, .writer, #sheet-root') && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable));
}
function softRender() {
  if (typingInSheet()) { renderMain(); return; }
  renderMain(); if (ui.sheet && ui.sheet.type !== 'event') renderSheet();
}
function viewHTML() {
  if (areaOf(ui.view)) return areaView(areaOf(ui.view));
  switch (ui.view) {
    case 'notes': return notesView();
    case 'project': return ui.projectId && db.projects[ui.projectId] && !db.projects[ui.projectId].deleted ? projectView(db.projects[ui.projectId]) : homeView();
    case 'review': return reviewView();
    case 'shared': return sharedView();
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
  const l = { id: uid(), name: '', areaId, kind, htype: kind === 'habit' ? 'yn' : undefined, draft: kind === 'habit' ? true : undefined, unit: '', repeat: kind === 'habit' ? 'daily' : '', items: [], checks: {}, vals: {}, createdAt: new Date().toISOString(), updatedAt: now(), deleted: false };
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
/* achievement cards for the section: habits and repeating tasks */
/* ---------- charts used across the app ---------- */
function donutSVG(parts, size = 84, w = 10) {
  /* parts: [[fraction, colour], …] drawn clockwise from the top over a dim track */
  const r = (size - w) / 2, c = 2 * Math.PI * r, cx = size / 2;
  let off = 0, segs = '';
  parts.forEach(([f, col]) => {
    const len = Math.max(0, Math.min(1, f)) * c; if (len <= 0.01) return;
    segs += `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${col}" stroke-width="${w}" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cx})" stroke-linecap="${parts.length === 1 ? 'round' : 'butt'}"/>`;
    off += len;
  });
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--s2)" stroke-width="${w}"/>${segs}</svg>`;
}
const vDonut = (k, pct, center, sub, col = 'var(--sand)') => `<div class="viz vd"><div class="dw">${donutSVG([[pct, col]])}<b>${center}</b></div><div class="vt"><span class="k">${k}</span><span class="s">${sub}</span></div></div>`;
const vBar = (k, v, frac, sub, col = 'var(--sand)') => `<div class="viz vb"><span class="k">${k}</span><span class="v">${v}</span><span class="pbar"><i style="width:${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%;background:${col}"></i></span><span class="s">${sub}</span></div>`;

/* ---------- habits: a clean calendar outside, editing inside ---------- */
function habitGrid(l, m, editable) {
  const td = today(), first = pd(m + '-01'), lead = first.getDay();
  const dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const total = Math.ceil((lead + dim) / 7) * 7, start = addD(m + '-01', -lead);
  const isNum = l.htype === 'num', sel = ui.hSel && ui.hSel[l.id];
  let cells = '';
  for (let i = 0; i < total; i++) {
    const d = addD(start, i), out = d.slice(0, 7) !== m, fut = d > td, v = hv(l, d);
    const mark = isNum ? (typeof v === 'number' ? `<b>${fmtNum(v)}</b>` : '') : v === true ? `<i class="hy">${I.check}</i>` : v === false ? `<i class="hn">${I.x}</i>` : '';
    const cls = `hc ${out ? 'out' : ''} ${d === td ? 'today' : ''} ${editable && d === sel ? 'sel' : ''} ${v === true ? 'yes' : v === false ? 'no' : typeof v === 'number' ? 'val' : ''} ${fut && !out ? 'fut' : ''}`;
    const inner = `<span class="dn">${pd(d).getDate()}</span>${out ? '' : mark}`;
    cells += editable && !out && !fut
      ? `<button class="${cls}" data-act="hpick" data-id="${esc(l.id)}" data-d="${d}" aria-label="${esc(fmtDay(d))}">${inner}</button>`
      : `<span class="${cls}">${inner}</span>`;
  }
  return `<div class="hwd">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(w => `<span>${w}</span>`).join('')}</div><div class="hgrid">${cells}</div>`;
}
function habitCardHTML(l) {
  const m = today().slice(0, 7);
  return `<button class="card hcard ${l.htype === 'num' ? 'hk-num' : 'hk-yn'}" data-act="hopen" data-id="${esc(l.id)}" aria-label="Open ${esc(l.name || 'habit')}">
    <span class="hname"><span dir="auto">${esc(l.name || 'Untitled habit')}</span><small>${l.htype === 'num' ? (l.unit ? esc(l.unit) : '123') : '✓ / ✗'}</small></span>
    <span class="hmon">${esc(pd(m + '-01').toLocaleDateString('en-GB', { month: 'long' }))}</span>
    ${habitGrid(l, m, false)}
  </button>`;
}
/* a new habit: name it, pick its kind (and unit) once — then it only shows its calendar */
function habitSetupSheet(l) {
  return `
  <div class="sheet-top"><button class="ib" data-act="close-sheet" aria-label="Close">${I.l}</button><span class="crumb">New habit</span><span style="width:40px"></span></div>
  <textarea id="l-name" class="title-in" rows="1" dir="auto" placeholder="Habit, e.g. الوزن or رياضة">${esc(l.name || '')}</textarea>
  ${sec('What do you track?', `<div class="htypes">
    <button class="htypeb ${l.htype !== 'num' ? 'on' : ''}" data-act="htype" data-id="${esc(l.id)}" data-v="yn"><span class="ic"><i class="hy">${I.check}</i><i class="hn">${I.x}</i></span><b>Did it / didn’t</b><small>Choose ✓ or ✗ for each day</small></button>
    <button class="htypeb ${l.htype === 'num' ? 'on' : ''}" data-act="htype" data-id="${esc(l.id)}" data-v="num"><span class="ic num">123</span><b>Number</b><small>Type a value each day, like weight</small></button>
  </div>
  ${l.htype === 'num' ? `<div class="card" style="margin-top:10px"><div class="field"><label for="h-unit">Unit</label><input id="h-unit" class="tin" data-lid="${esc(l.id)}" dir="auto" placeholder="kg, steps, OMR…" value="${esc(l.unit || '')}" style="max-width:160px;text-align:end"></div></div>` : ''}
  `)}
  <button class="btn pri full" style="margin-top:18px" data-act="h-create" data-id="${esc(l.id)}">Create habit</button>
  <p class="mut" style="font-size:12px;margin:10px 2px 0;text-align:center">The kind${l.htype === 'num' ? ' and unit' : ''} can’t be changed later.</p>`;
}
function habitSheet(l) {
  if (l.draft) return habitSetupSheet(l);
  const td = today(), m = (ui.hMonth && ui.hMonth[l.id]) || td.slice(0, 7);
  const sel = ui.hSel && ui.hSel[l.id], v = sel ? hv(l, sel) : undefined;
  const picker = !sel ? '<p class="hhint">Tap a day to fill it in</p>' : l.htype === 'num'
    ? `<div class="hpick"><span class="hd">${sel === td ? 'Today' : esc(fmtDay(sel))}</span><input id="hp-num" class="tin" inputmode="decimal" enterkeyhint="done" value="${typeof v === 'number' ? String(Math.round(v * 100) / 100) : ''}" placeholder="${hLast(l) ? fmtNum(hLast(l).v) : '0'}" aria-label="Value"><span class="hu">${esc(l.unit || '')}</span><button class="btn pri" data-act="hsave" data-id="${esc(l.id)}">Save</button>${typeof v === 'number' ? `<button class="pill" data-act="hset" data-id="${esc(l.id)}" data-v="">Clear</button>` : ''}</div>`
    : `<div class="hpick"><span class="hd">${sel === td ? 'Today' : esc(fmtDay(sel))}</span><div class="hchoice"><button class="ok ${v === true ? 'on' : ''}" data-act="hset" data-id="${esc(l.id)}" data-v="1"><i class="hy">${I.check}</i>Done</button><button class="no ${v === false ? 'on' : ''}" data-act="hset" data-id="${esc(l.id)}" data-v="0"><i class="hn">${I.x}</i>Not done</button>${v !== undefined ? `<button class="clr" data-act="hset" data-id="${esc(l.id)}" data-v="">Clear</button>` : ''}</div></div>`;
  const n = Object.keys(l.vals || {}).length;
  return `
  <div class="sheet-top"><button class="ib" data-act="close-sheet" aria-label="Close">${I.l}</button><span class="crumb">Habit</span><button class="ib" data-act="list-del" data-id="${esc(l.id)}" aria-label="Delete habit">${I.trash}</button></div>
  <textarea id="l-name" class="title-in" rows="1" dir="auto" placeholder="Habit, e.g. الوزن or رياضة">${esc(l.name || '')}</textarea>
  <div class="card hsheet">
    <div class="hnav"><button class="ib" data-act="hmonth" data-id="${esc(l.id)}" data-dir="-1" aria-label="Previous month">${I.l}</button><span>${esc(pd(m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))}</span><button class="ib" data-act="hmonth" data-id="${esc(l.id)}" data-dir="1" aria-label="Next month" ${m >= td.slice(0, 7) ? 'disabled style="opacity:.3"' : ''}>${I.r}</button></div>
    ${habitGrid(l, m, true)}
    ${picker}
  </div>
  ${n ? `<p class="mut" style="font-size:12px;margin:12px 2px 0">${n} ${n === 1 ? 'day' : 'days'} recorded · ${l.htype === 'num' ? 'Number' + (l.unit ? ' (' + esc(l.unit) + ')' : '') : '✓ / ✗'}</p>` : ''}`;
}
/* one card per habit, up with the rest of the Personal stats */
function habitStatsHTML(aid) {
  const hs = lists(aid, 'habit'); if (!hs.length) return '';
  const m = today().slice(0, 7);
  return `<div class="hstatgrid">${hs.map(l => {
    if (l.htype === 'num') {
      const last = hLast(l);
      const pts = []; for (let i = 29; i >= 0; i--) { const x = hv(l, addD(today(), -i)); if (typeof x === 'number') pts.push(x); }
      const d = last && last.prev !== null ? last.v - last.prev : null;
      return `<button class="card hstat" data-act="hopen" data-id="${esc(l.id)}"><span class="k" dir="auto">${esc(l.name || 'Habit')}</span>
        <span class="v">${last ? fmtNum(last.v) : '—'}<small>${esc(l.unit || '')}</small>${d !== null ? `<em class="${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '+' : ''}${fmtNum(d)}</em>` : ''}</span>
        ${pts.length > 1 ? sparkSVG(pts, 150, 30) : '<span class="s">last 30 days</span>'}
        <span class="s">${pts.length ? `${fmtNum(Math.min(...pts))} – ${fmtNum(Math.max(...pts))} · ${pts.length} entries` : 'no entries yet'}</span></button>`;
    }
    const s = hMonth(l, m), st = hStreak(l), pct = s.days ? s.yes / s.days : 0;
    return `<button class="card hstat" data-act="hopen" data-id="${esc(l.id)}"><span class="k" dir="auto">${esc(l.name || 'Habit')}</span>
      <span class="hsrow"><span class="dw sm">${donutSVG([[s.days ? s.yes / s.days : 0, 'var(--green)'], [s.days ? s.no / s.days : 0, 'var(--red)']], 58, 8)}<b>${Math.round(pct * 100)}%</b></span>
      <span class="hsn"><span><i class="g"></i>${s.yes} done</span><span><i class="r"></i>${s.no} missed</span><span class="st">${st ? `${st} ${st === 1 ? 'day' : 'days'} in a row` : 'no streak yet'}</span></span></span></button>`;
  }).join('')}</div>`;
}

/* ---------- projects: importance, brief, timeline ---------- */
const PRIO = [[0, 'Normal'], [1, 'Important'], [2, 'Top priority']];
function timelineHTML(p, ts) {
  const td = today(), stages = p.stages || [];
  const created = isoDay(p.createdAt || new Date().toISOString());
  let rows = [], prevEnd = null;
  stages.forEach(st => {
    const list = ts.filter(t => t.stageId === st.id);
    const ds = list.map(t => t.due).filter(Boolean).sort();
    const fc = list.map(t => t.createdAt && isoDay(t.createdAt)).filter(Boolean).sort()[0];
    let start = st.start || prevEnd || fc || created;
    let end = st.due || ds[ds.length - 1] || addD(start, 6);
    if (end < start) start = end;
    rows.push({ name: st.name || 'Stage', start, end, done: list.filter(t => t.done).length, total: list.length, tasks: list });
    prevEnd = end;
  });
  if (!stages.length) rows = ts.filter(t => t.due).sort(byDue).slice(0, 8).map(t => ({ name: t.title, start: t.due, end: t.due, done: t.done ? 1 : 0, total: 1, tasks: [t] }));
  if (!rows.length) return `<div class="tl-empty">Add stages with dates, or give tasks a due date, to see this project's timeline here.</div>`;
  let min = rows.reduce((a, r) => r.start < a ? r.start : a, rows[0].start), max = rows.reduce((a, r) => r.end > a ? r.end : a, rows[0].end);
  if (p.deadline && p.deadline > max) max = p.deadline;
  if (td > min && td < addD(max, 14) && td > max) max = td;
  min = addD(min, -1); max = addD(max, 1);
  const span = Math.max(1, diffD(min, max) + 1), at = d => (diffD(min, d) / span) * 100;
  const n = Math.min(8, Math.max(3, Math.round(span / 4)));
  const ticks = []; for (let i = 0; i < n; i++) ticks.push(addD(min, Math.round((span - 1) * i / (n - 1))));
  const fmtT = d => pd(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const bars = rows.map(r => {
    const left = at(r.start), w = Math.max(at(addD(r.end, 1)) - left, 100 / span);
    r.l = left; r.w = w;
    const cur = r.start <= td && td <= r.end, fin = r.total && r.done === r.total, late = !fin && r.end < td;
    return `<div class="tl-row"><div class="tl-bar ${cur ? 'cur' : ''} ${fin ? 'fin' : ''} ${late ? 'late' : ''}" style="left:${left.toFixed(2)}%;width:${w.toFixed(2)}%;--f:${r.total ? Math.round(r.done / r.total * 100) : 0}%" title="${esc(r.name)} · ${esc(fmtT(r.start))} – ${esc(fmtT(r.end))}"><span dir="auto">${esc(r.name)}</span>${r.total > 1 || stages.length ? `<small>${r.done}/${r.total}</small>` : ''}</div></div>`;
  }).join('');
  /* what is in each stage, under its start like the reference: a few tasks as bullets */
  const notes = stages.length ? `<div class="tl-notes">${rows.map(r => `<div class="tl-col" style="left:${r.l.toFixed(2)}%;width:${Math.max(r.w, 14).toFixed(2)}%">${r.tasks.slice(0, 4).map(t => `<span class="${t.done ? 'd' : ''}" dir="auto">${esc(t.title)}</span>`).join('')}${r.tasks.length > 4 ? `<span class="m">+${r.tasks.length - 4} more</span>` : ''}</div>`).join('')}</div>` : '';
  return `<div class="tl-wrap"><div class="tl" style="--rows:${rows.length}">
    <div class="tl-grid">${ticks.map(d => `<i style="left:${at(d).toFixed(2)}%"></i>`).join('')}</div>
    ${td >= min && td <= max ? `<div class="tl-today" style="left:${at(td).toFixed(2)}%"><span>Today</span></div>` : ''}
    ${p.deadline && p.deadline >= min && p.deadline <= max ? `<div class="tl-dl" style="left:${at(addD(p.deadline, 1)).toFixed(2)}%"><span>Deadline</span></div>` : ''}
    <div class="tl-rows">${bars}</div>
    <div class="tl-ticks">${ticks.map(d => `<span style="left:${at(d).toFixed(2)}%">${esc(fmtT(d))}</span>`).join('')}</div>
    ${notes}
  </div></div>`;
}
function reviewNumbersHTML(r) {
  const frac = (a, b) => b ? a / b : 0;
  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const busiest = r.done.length ? r.wk.indexOf(Math.max(...r.wk)) : -1;
  const lead = avg(r.lead);
  const repOk = r.rep.filter(l => !l.late).length;
  /* rates as rings */
  const rings = `<div class="vgrid g3">
    ${vDonut('Completion', frac(r.plannedDone, r.planned), pct(r.plannedDone, r.planned), r.planned ? `${r.plannedDone} of ${r.planned} due in range` : 'nothing due in range', 'var(--sand)')}
    ${vDonut('On time', frac(r.onTime, r.withDue.length), pct(r.onTime, r.withDue.length), r.withDue.length ? `${r.onTime} of ${r.withDue.length} dated tasks` : 'no dated tasks done', 'var(--green)')}
    ${vDonut('Repeats on time', frac(repOk, r.rep.length), pct(repOk, r.rep.length), r.rep.length ? `${repOk} of ${r.rep.length} repeats` : 'no repeats done', 'var(--blue)')}
  </div>`;
  /* activity: which days had something done */
  const dayStrip = []; for (let d = r.days > 42 ? addD(r.to, -41) : r.from; d <= r.to; d = addD(d, 1)) dayStrip.push(d);
  const streakStrip = []; for (let i = 13; i >= 0; i--) streakStrip.push(addD(today(), -i));
  const perMax = Math.max(1, ...dayStrip.map(d => r.perDay[d] || 0));
  const activity = `<div class="vgrid g2">
    <div class="viz"><span class="k">Active days</span><span class="v">${r.activeDays}<small>/${r.days}</small></span>
      <span class="dstrip">${dayStrip.map(d => `<i class="${r.perDay[d] ? 'on' : ''}" style="opacity:${r.perDay[d] ? (0.45 + 0.55 * (r.perDay[d] / perMax)).toFixed(2) : 1}" title="${esc(shortDay(d))}: ${r.perDay[d] || 0}"></i>`).join('')}</span>
      <span class="s">${pct(r.activeDays, r.days)} of days had something done</span></div>
    <div class="viz"><span class="k">Streak</span><span class="v">${r.streak}<small>${r.streak === 1 ? ' day' : ' days'}</small></span>
      <span class="dstrip s14">${streakStrip.map(d => `<i class="${r.doneDays.has(d) ? 'on' : ''} ${d === today() ? 'now' : ''}" title="${esc(shortDay(d))}"></i>`).join('')}</span>
      <span class="s">last 14 days · ${r.streak >= 3 ? 'keep it going' : 'one done task a day builds it'}</span></div>
  </div>`;
  /* flow: created vs done, per day */
  const cmax = Math.max(1, r.created.length, r.done.length);
  const flow = `<div class="vgrid g2">
    <div class="viz"><span class="k">Created vs done</span>
      <span class="cmp"><span>Created</span><span class="pbar"><i style="width:${Math.round(r.created.length / cmax * 100)}%;background:var(--blue)"></i></span><b>${r.created.length}</b></span>
      <span class="cmp"><span>Done</span><span class="pbar"><i style="width:${Math.round(r.done.length / cmax * 100)}%;background:var(--green)"></i></span><b>${r.done.length}</b></span>
      <span class="s">${r.done.length >= r.created.length ? 'You are keeping up' : `${r.created.length - r.done.length} more added than done`}</span></div>
    <div class="viz"><span class="k">Per day</span><span class="v">${(r.done.length / r.days).toFixed(1)}<small> avg</small></span>
      <span class="mbars">${dayStrip.slice(-21).map(d => `<i style="height:${Math.max(8, Math.round((r.perDay[d] || 0) / perMax * 100))}%" class="${r.perDay[d] ? '' : 'z'}"></i>`).join('')}</span>
      <span class="s">best day ${r.bestDay ? `${r.bestDay[1]} · ${esc(shortDay(r.bestDay[0]))}` : '—'}</span></div>
  </div>`;
  /* load: overdue, urgent, projects */
  const openN = Math.max(1, r.open.length);
  const P = r.projOpen + r.projDone;
  const load = `<div class="vgrid g3">
    ${vBar('Overdue', r.overdue.length, r.overdue.length / openN, r.overdue.length ? `${pct(r.overdue.length, r.open.length)} of open · avg ${r.overdueAge.toFixed(1)} d late` : 'nothing overdue', 'var(--orange)')}
    ${vBar('Urgent', r.urgentOpen, r.urgentOpen / openN, `${pct(r.urgentOpen, r.open.length)} of open tasks`, 'var(--red)')}
    <div class="viz vd"><div class="dw">${donutSVG([[frac(r.projDone, P), 'var(--green)'], [frac(r.projOpen, P), 'var(--sand)']])}<b>${P}</b></div><div class="vt"><span class="k">Projects</span><span class="s"><i class="lg" style="background:var(--sand)"></i>${r.projOpen} open<br><i class="lg" style="background:var(--green)"></i>${r.projDone} completed${r.projDoneRange ? ` · ${r.projDoneRange} in range` : ''}</span></div></div>
  </div>`;
  /* where the work went: done by section (or project / stage) */
  const ent = Object.entries(r.by).filter(([, v]) => v.done + v.open);
  const pal = ['var(--sand)', 'var(--blue)', 'var(--green)', '#B7A4D0', 'var(--orange)', 'var(--sand2)', 'var(--s3)'];
  const colOf = (n, i) => { const a = AREAS.find(x => x.name === n); return a ? a.color : pal[i % pal.length]; };
  const tot = ent.reduce((a, [, v]) => a + v.done, 0);
  const split = tot ? `<div class="viz vsplit"><div class="dw big">${donutSVG(ent.map(([n, v], i) => [v.done / tot, colOf(n, i)]), 120, 14)}<b>${tot}<small>done</small></b></div>
    <div class="vlegend">${ent.sort((a, b) => b[1].done - a[1].done).map(([n, v], i) => `<span><i style="background:${colOf(n, i)}"></i><span dir="auto">${esc(n)}</span><b>${v.done}</b><em>${pct(v.done, tot)}</em></span>`).join('')}</div></div>` : '';
  const extra = `<div class="vgrid g3">
    <div class="viz"><span class="k">Time to finish</span><span class="v">${lead === null ? '—' : lead < 1 ? Math.round(lead * 24) + '<small> h</small>' : lead.toFixed(1) + '<small> d</small>'}</span><span class="s">average, created → done</span></div>
    <div class="viz"><span class="k">Busiest day</span><span class="v">${busiest >= 0 ? WD[busiest].slice(0, 3) : '—'}</span><span class="s">${busiest >= 0 ? r.wk[busiest] + ' done on ' + WD[busiest] + 's' : ''}</span></div>
    <div class="viz"><span class="k">${r.notesN === null ? 'Postponed' : 'Notes · Postponed'}</span><span class="v">${r.notesN === null ? r.postponed.length : `${r.notesN}<small> · ${r.postponed.length}</small>`}</span><span class="s">${r.notesN === null ? 'times a date was pushed' : 'notes written · dates pushed'}</span></div>
  </div>`;
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
  const B = r.buckets, btot = Math.max(1, B.overdue + B.today + B.week + B.later + B.none);
  const seg = (v, c, l) => v ? `<i style="width:${v / btot * 100}%;background:${c}" title="${l}: ${v}"></i>` : '';
  const key = (v, c, l) => `<span><i style="background:${c}"></i>${l} <b>${v}</b></span>`;
  const due = `<div class="stack">${seg(B.overdue, 'var(--orange)', 'Overdue')}${seg(B.today, 'var(--sand)', 'Today')}${seg(B.week, 'var(--blue)', 'Next 7 days')}${seg(B.later, 'var(--green)', 'Later')}${seg(B.none, 'var(--s3)', 'No date')}</div>
    <div class="skey">${key(B.overdue, 'var(--orange)', 'Overdue')}${key(B.today, 'var(--sand)', 'Today')}${key(B.week, 'var(--blue)', 'Next 7 days')}${key(B.later, 'var(--green)', 'Later')}${key(B.none, 'var(--s3)', 'No date')}</div>`;
  return sec('Rates', rings) + sec('Activity', activity + flow) + sec('Load', load)
    + (split ? sec(r.sc.fP ? 'Done by stage' : r.sc.fA ? 'Done by project' : 'Done by section', split) : '')
    + sec(weekly ? 'Done per week' : 'Done per day', `<div class="card chartc">${chart}</div>`)
    + `<div class="rgrid">${sec('By weekday', `<div class="card chartc">${wchart}</div>`)}${sec('Open tasks by due date', `<div class="card chartc">${due}</div>`)}</div>`
    + sec('More', extra);
}

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
  </div>${habitStatsHTML(aid)}</section>`;
}
function habitSaveNum(id) {
  const l = db.lists[id], d = ui.hSel && ui.hSel[id], inp = $('#hp-num'); if (!l || !d || !inp) return;
  const raw = inp.value.replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)).replace(/[٫,]/g, '.').trim();
  const vals = { ...(l.vals || {}) };
  if (raw === '') delete vals[d]; else { const n = parseFloat(raw); if (isNaN(n)) { toast('Type a number'); return; } vals[d] = n; }
  updList(l, { vals }); ui.hSel[id] = null; renderSheet(); renderMain();
}
function habitsHTML(areaId) {
  migrateHabits();
  const ls = lists(areaId, 'habit');
  return sec('Habit trackers', `<div class="hlist">${ls.map(habitCardHTML).join('')}</div>
    ${ls.length ? '' : '<p class="mut" style="font-size:12px;margin:0 2px">Each habit gets its own calendar: green ✓ or red ✗ for things you did or didn’t do, or a number you type in, like your weight.</p>'}
    <button class="dash" style="width:100%;margin-top:10px" data-act="new-list" data-area="${areaId}" data-kind="habit">+ New habit tracker</button>`, { right: `<span class="mut">Tap one to fill it in</span>` });
}
/* ---------------- rich notes ----------------
   Notes keep a small HTML subset: <h1>, <h2>, <p> blocks with <b> (bold) and <span class="l"> (light) inside.
   The tablet's native editor reads and writes exactly the same subset (RichText.kt). n.text stays as plain text. */
const NOTE_COLORS = [['#0E0F13', 'Black'], ['#1D202C', 'Navy'], ['#18222F', 'Ink'], ['#1A2621', 'Forest'], ['#251E2C', 'Plum'], ['#2A221E', 'Cocoa'], ['#23262C', 'Slate'], ['#29261E', 'Olive']];
const noteColor = n => (n && n.color) || NOTE_COLORS[0][0];
function richParse(html) {
  const t = document.createElement('template'); t.innerHTML = html || '';
  const blocks = []; let cur = null;
  const open = (tag, dir) => { cur = { tag, dir: dir === 'rtl' || dir === 'ltr' ? dir : null, segs: [] }; blocks.push(cur); };
  const walk = (node, f) => {
    node.childNodes.forEach(ch => {
      if (ch.nodeType === 3) { if (!cur) open('p'); if (ch.nodeValue) cur.segs.push({ t: ch.nodeValue.replace(/ /g, ' '), b: f.b, l: f.l }); return; }
      if (ch.nodeType !== 1) return;
      const tag = ch.tagName.toLowerCase();
      if (tag === 'br') { if (ch.nextSibling) open('p'); else if (!cur) open('p'); return; }
      if (/^(h1|h2|h3|p|div|li|blockquote)$/.test(tag)) { open(tag === 'h1' ? 'h1' : tag === 'h2' || tag === 'h3' ? 'h2' : 'p', (ch.getAttribute('dir') || '').toLowerCase()); walk(ch, f); cur = null; return; }
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
    return `<${bl.tag}${bl.dir ? ` dir="${bl.dir}"` : ''}>${merged.map(s => s.b ? `<b>${esc(s.t)}</b>` : s.l ? `<span class="l">${esc(s.t)}</span>` : esc(s.t)).join('')}</${bl.tag}>`;
  }).join('');
  const text = blocks.map(bl => bl.segs.map(s => s.t).join('')).join('\n');
  return { html, text };
}
const textToHtml = txt => String(txt || '').split('\n').map(l => `<p>${esc(l)}</p>`).join('');
/* what goes into the editor: clean subset, with a <br> in empty blocks so the caret can sit there */
function richForEditor(n) {
  const h = richOut(richParse(n.html ? n.html : textToHtml(n.text))).html || '<p></p>';
  /* every block finds its own direction (Arabic right, English left) unless one was set */
  return h.replace(/<(p|h1|h2)( dir="(?:rtl|ltr)")?><\/\1>/g, '<$1$2><br></$1>').replace(/<(p|h1|h2)>/g, '<$1 dir="auto">');
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
  [...ed.children].forEach(b => { if (!b.getAttribute('dir')) b.setAttribute('dir', 'auto'); });
}
/* One button, like Google Docs: flips the paragraphs under the cursor between right-to-left and left-to-right.
   New paragraphs still pick their direction from the language you type in. */
function richDirToggle() {
  const ed = $('#n-rich'); const sel = getSelection(); if (!ed) return;
  let b = null;
  if (sel.rangeCount && ed.contains(sel.anchorNode)) { let n = sel.anchorNode; if (n.nodeType === 3) n = n.parentElement; while (n && n.parentElement !== ed) n = n.parentElement; b = n; }
  if (!b) b = ed.lastElementChild;
  const cur = b && getComputedStyle(b).direction === 'rtl';
  richDir(cur ? 'ltr' : 'rtl');
}
/* writing direction of the paragraphs under the cursor: ltr or rtl */
function richDir(d) {
  const ed = $('#n-rich'); const sel = getSelection(); if (!ed) return;
  let bls = [];
  if (sel.rangeCount && ed.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    const r = sel.getRangeAt(0);
    bls = richBlocksIn(r);
    if (!bls.length) { let n = r.startContainer; if (n.nodeType === 3) n = n.parentElement; while (n && n.parentElement !== ed) n = n.parentElement; if (n) bls = [n]; }
  }
  if (!bls.length) bls = [...ed.children];
  bls.forEach(b => b.setAttribute('dir', d));
  richSave(); richToolsState();
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
  const sel = getSelection(); let keep = null;
  if (sel.rangeCount) { let n = sel.anchorNode; if (n && n.nodeType === 3) n = n.parentElement; const b = n && n.closest && n.closest('#n-rich > *'); if (b) keep = b.getAttribute('dir'); }
  document.execCommand('formatBlock', false, tag);
  if (keep && keep !== 'auto' && sel.rangeCount) richBlocksIn(sel.getRangeAt(0)).forEach(b => { if (!b.getAttribute('dir')) b.setAttribute('dir', keep); });
  richEnsureBlock(); richSave(); richToolsState();
}
function richToolsState() {
  const tb = $('#ntools'); const sel = getSelection(); if (!tb || !sel.rangeCount) return;
  let n = sel.anchorNode; if (n && n.nodeType === 3) n = n.parentElement;
  const ed = $('#n-rich'); if (!ed || !n || !ed.contains(n)) return;
  const blk = n.closest('h1,h2') ? n.closest('h1,h2').tagName.toLowerCase() : 'p';
  const w = n.closest('b,strong') ? 'bold' : n.closest('span.l') ? 'light' : 'regular';
  tb.querySelectorAll('[data-fmt]').forEach(b => b.classList.toggle('on', b.dataset.fmt === blk || b.dataset.fmt === w));
  const bl = n.closest('#n-rich > *'); const d = bl && getComputedStyle(bl).direction === 'rtl' ? 'rtl' : 'ltr';
  const db1 = tb.querySelector('[data-act=ndir-toggle]'); if (db1 && db1.dataset.cur !== d) { db1.dataset.cur = d; db1.innerHTML = d === 'rtl' ? I.dirRtl : I.dirLtr; }
}
document.addEventListener('selectionchange', () => { if ($('#n-rich')) richToolsState(); });
document.addEventListener('pointerdown', e => { if (!e.target.closest || !e.target.closest('#ntools .ng.fold')) document.querySelectorAll('#ntools .ng.fold.open').forEach(x => x.classList.remove('open')); }, true);
/* keep the text selected when a format button is pressed */
document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('#ntools [data-fmt], #ntools [data-act=ndir-toggle]')) e.preventDefault(); });
document.addEventListener('paste', e => {
  if (!e.target.closest || !e.target.closest('#n-rich')) return;
  e.preventDefault();
  const t = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, t);
});
function noteToolsHTML(n) {
  const c = noteColor(n);
  return `<div class="ntools" id="ntools" role="toolbar" aria-label="Formatting">
    <div class="ng fold" data-g="blk"><button data-act="nfmt" data-fmt="h1" aria-label="Heading 1">H1</button><button data-act="nfmt" data-fmt="h2" aria-label="Heading 2">H2</button><button class="on" data-act="nfmt" data-fmt="p" aria-label="Body text">Text</button></div>
    <div class="ng fold" data-g="wt"><button data-act="nfmt" data-fmt="bold" aria-label="Bold"><b>B</b></button><button class="on" data-act="nfmt" data-fmt="regular" aria-label="Regular">Aa</button><button data-act="nfmt" data-fmt="light" aria-label="Light"><span style="font-weight:300">Aa</span></button></div>
    <button class="ndir1" data-act="ndir-toggle" data-cur="ltr" aria-label="Text direction" title="Text direction (right-to-left / left-to-right)">${I.dirLtr}</button>
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
    return `<button class="ncard ${i === 0 && !q && !n.color ? 'first' : ''} ${n.color ? 'tinted' : ''}" data-act="open-note" data-id="${esc(n.id)}" ${n.color ? `style="--npage:${esc(n.color)}"` : ''}><span class="t" dir="auto">${esc(t)}</span>${p ? `<span class="p" dir="auto">${esc(p.slice(0, 280))}</span>` : ''}${hasInk(n) ? `<canvas class="nthumb" data-ink="${esc(n.id)}" aria-hidden="true"></canvas>` : ''}<span class="d">${(n.audio || []).length ? `<span class="vtag">${I.mic}${n.audio.length > 1 ? n.audio.length : ''}</span>` : ''}${esc(new Date(n.updatedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</span></button>`;
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
  const allP = areaProjects(a.id), ps = allP.filter(p => !p.done).sort((x, y) => (y.priority || 0) - (x.priority || 0)), psDone = allP.filter(p => p.done);
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
  const ts = allTasks().filter(t => t.projectId === p.id);
  const a = areaOf(p.areaId);
  const name = p.name.toLowerCase();
  const linked = unionEvents().filter(e => e.title.toLowerCase().includes(name) && evDays(e).slice(-1)[0] >= today()).slice(0, 5);
  const stageBlock = (st) => {
    const list = sortOpen(ts.filter(t => (st ? t.stageId === st.id : !t.stageId || !(p.stages || []).some(x => x.id === t.stageId))));
    const doneN = list.filter(t => t.done).length;
    const head = st
      ? `<div class="stage-h"><input id="st-${esc(st.id)}" data-stage="${esc(st.id)}" dir="auto" value="${esc(st.name)}" aria-label="Stage name"><span class="mut num" style="font-size:12px;white-space:nowrap">${doneN}/${list.length}</span><span class="sdates"><input type="date" id="sts-${esc(st.id)}" data-stage-start="${esc(st.id)}" value="${esc(st.start || '')}" aria-label="Stage start date"><span>→</span><input type="date" id="std-${esc(st.id)}" data-stage-due="${esc(st.id)}" value="${esc(st.due || '')}" aria-label="Stage due date"></span><button class="ib" data-act="del-stage" data-sid="${esc(st.id)}" aria-label="Delete stage">${I.x}</button></div>`
      : `<div class="stage-h"><span style="font-size:15px;font-weight:600;padding:4px 0">${(p.stages || []).length ? 'Other' : 'Tasks'}</span><span class="mut num" style="font-size:12px">${doneN}/${list.length}</span></div>`;
    if (!st && !list.length && (p.stages || []).length) return '';
    return `<div class="stage">${head}${list.map(t => taskHTML(t, { inArea: true, inProject: true })).join('')}
      ${addForm('stage', st ? 'Add task to ' + st.name : 'Add task', { id: 'add-' + (st ? st.id : 'none'), data: `data-sid="${st ? esc(st.id) : ''}"` })}</div>`;
  };
  return `<div class="pview">
    <div class="hdr" style="margin-bottom:8px">${p.sh && shRole(p.sh) !== 'owner' ? `<button class="pill" data-act="nav" data-v="shared" style="display:inline-flex;align-items:center;gap:6px;padding-left:8px">${I.l}Shared</button>` : `<button class="pill" data-act="nav" data-v="${a ? a.id : 'home'}" style="display:inline-flex;align-items:center;gap:6px;padding-left:8px">${I.l}${a ? adot(a) + esc(a.name) : 'Home'}</button>`}<span class="phbtns">${p.sh ? `<button class="avs" data-act="proj-share" aria-label="People">${shMembers(p.sh).slice(0, 5).map(m => avatar(p.sh, m.email)).join('')}${shMembers(p.sh).length > 5 ? `<span class="av more">+${shMembers(p.sh).length - 5}</span>` : ''}</button>` : ''}<button class="ib" data-act="proj-pdf" aria-label="Export PDF" title="Export PDF">${I.pdf}</button><button class="ib" data-act="proj-share" aria-label="Share project" title="Share">${I.people}</button><button class="ib" data-act="del-project" aria-label="${p.sh && shRole(p.sh) !== 'owner' ? 'Leave project' : 'Delete project'}">${I.trash}</button></span></div>
    <div class="ptitle"><button class="pchk ${p.done ? 'on' : ''}" data-act="proj-done" aria-pressed="${!!p.done}" aria-label="${p.done ? 'Mark project not done' : 'Mark project done'}">${p.done ? I.check : ''}</button><input id="proj-name" class="title-in" style="font-size:28px" dir="auto" value="${esc(p.name)}" aria-label="Project name"></div>
    ${p.done ? `<div class="pdone-note">${I.check} Completed ${esc(fmtDay(isoDay(p.doneAt || new Date().toISOString())))}</div>` : s.total && s.done === s.total ? `<button class="pdone-cta" data-act="proj-done">All ${s.total} tasks are done. Mark the project as completed</button>` : ''}
    <textarea id="proj-brief" class="pbrief" rows="1" dir="auto" placeholder="Add a brief — the one thing to remember about this project" aria-label="Project brief">${esc(p.brief || '')}</textarea>
    <div class="pprio" role="group" aria-label="Importance">${PRIO.map(([v, l]) => `<button data-act="proj-prio" data-v="${v}" class="pr-${v} ${(p.priority || 0) === v ? 'on' : ''}" aria-pressed="${(p.priority || 0) === v}">${l}</button>`).join('')}</div>
    <div style="display:flex;align-items:center;gap:10px;margin:10px 0 12px;flex-wrap:wrap;font-size:13px" class="mut">
      <span>${s.done} of ${s.total} done</span><span>·</span>
      <label style="display:flex;align-items:center;gap:6px">Deadline <input type="date" id="proj-deadline" value="${esc(p.deadline || '')}" style="background:transparent;border:0;color:var(--tx);color-scheme:dark;font-size:13px"></label>
      ${p.sh && shRole(p.sh) !== 'owner' ? `<span>·</span><span>Shared by ${esc(shName(p.sh, SH[p.sh].data && SH[p.sh].data.owner))}</span>` : `<span>·</span>
      <label style="display:flex;align-items:center;gap:6px">Section <select id="proj-area" class="mini-sel"><option value="">None</option>${AREAS.map(x => `<option value="${x.id}" ${p.areaId === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>`}
    </div>
    <div class="prog"><i style="width:${s.pct}%"></i></div>
    ${sec('Timeline', timelineHTML(p, ts))}
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
    days, perDay, wk, withDue, onTime, lead, buckets, urgentOpen, overdueAge, projDoneRange, projOpen, projDone, notesN, streak, doneDays, activeDays: Object.keys(perDay).length, bestDay };
}
function reviewView() {
  const [from, to] = reviewRange();
  ensureReviewEvents(from, to);
  const r = reviewData(from, to);
  const sc = r.sc;
  const loading = ui.rEvents === null;
  const seg = (n, l) => `<button class="${ui.rDays === n ? 'on' : ''}" data-act="range" data-n="${n}" aria-pressed="${ui.rDays === n}">${l}</button>`;
  const stat = (k, v, s, cls = '', cc = '', bar = null, bc = 'var(--sand)') => `<div class="card stat ${cc}"><span class="k">${k}</span><span class="v ${cls}">${v}</span>${bar === null ? '' : `<span class="pbar"><i style="width:${Math.round(Math.max(0, Math.min(1, bar)) * 100)}%;background:${bc}"></i></span>`}<span class="s">${s}</span></div>`;
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
      ${(p.stages || []).map(st => { const ts = allTasks().filter(t => t.projectId === p.id && t.stageId === st.id); const d = ts.filter(t => t.done).length; const pc = ts.length ? Math.round(d / ts.length * 100) : 0; return `<div style="margin-top:12px"><div style="display:flex;justify-content:space-between;font-size:13px;gap:8px"><span dir="auto">${esc(st.name)}</span><span class="mut">${d}/${ts.length}${st.due ? ' · ' + esc(shortDay(st.due)) : ''}</span></div><div class="prog" style="margin-top:6px;height:4px"><i style="width:${pc}%"></i></div></div>`; }).join('')}
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
      ${stat('Tasks done', r.done.length, r.planned ? `${r.plannedDone} of ${r.planned} planned in range` : 'nothing planned in range', '', 'lite', r.planned ? r.plannedDone / r.planned : 0, 'var(--ink)')}
      ${stat('Open now', r.open.length, r.overdue.length ? `<span class="or">${r.overdue.length} overdue</span>` : 'none overdue', '', '', r.open.length ? r.overdue.length / r.open.length : 0, 'var(--orange)')}
      ${stat('Done late', r.late.length, r.late.length ? `avg ${r.avgLate.toFixed(1)} days late` : 'none', r.late.length ? 'or' : '', '', r.done.length ? r.late.length / r.done.length : 0, 'var(--orange)')}
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
  if (s && s.type === 'list') { const l = db.lists[s.id]; if (l && !l.deleted && !(l.name || '').trim() && !l.items.length) { updList(l, { deleted: true }); } else if (l && l.draft) { updList(l, { draft: false }); } return; }
  if (!s || s.type !== 'note') return;
  const n = db.notes[s.id]; if (!n) return;
  clearTimeout(typeT);
  const recording = rec && rec.noteId === n.id; if (recording) recStop();
  if (!recording && !(n.text || '').trim() && !(n.title || '').trim() && !hasInk(n) && !(n.audio || []).length) { n.deleted = true; n.updatedAt = now(); }
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
  else if (s.type === 'share') inner = shareSheet();
  else if (s.type === 'join') inner = joinSheet();
  else if (s.type === 'note') { const n = db.notes[s.id]; if (!n || n.deleted) { ui.sheet = null; root.innerHTML = ''; document.body.style.overflow = ''; return; } inner = noteSheet(n); }
  else if (s.type === 'image') inner = imageSheet(s);
  else if (s.type === 'list') { const l = db.lists[s.id]; if (!l || l.deleted) { ui.sheet = null; root.innerHTML = ''; document.body.style.overflow = ''; return; } inner = listSheet(l); }
  const sc = $('.sheet', root); const top = sc ? sc.scrollTop : 0;
  if (s.type === 'note') { const nb = $('#n-body', root); const nt = nb ? nb.scrollTop : 0; root.innerHTML = inner; growNote(); bindInk(); hydrateAud(root); try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { } const b2 = $('#n-body', root); if (b2) { b2.scrollTop = nt; drawInkView(); } return; }
  root.innerHTML = `<div class="sheet-bg" data-act="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${s.type}">${inner}</div>`;
  const nsc = $('.sheet', root); if (nsc) nsc.scrollTop = top;
  autoGrow(); hydrateImgs(root);
}
function autoGrow() { document.querySelectorAll('textarea.title-in').forEach(el => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }); }
function taskSheet(t) {
  const ta = taskArea(t);
  const ps = t.sh ? [db.projects[t.projectId]].filter(Boolean) : (ta ? areaProjects(ta) : projects()).filter(x => !x.sh); const p = t.projectId && db.projects[t.projectId];
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
    <div class="field"><label for="t-project">Project</label><select id="t-project" ${t.sh ? 'disabled' : ''}>${t.sh ? '' : opt('', 'None', t.projectId || '')}${ps.map(x => opt(x.id, x.name, t.projectId)).join('')}</select></div>
    ${t.sh ? `<div class="field"><label for="t-assignee">Assigned to</label><select id="t-assignee">${opt('', 'Nobody', t.assignee || '')}${shMembers(t.sh).filter(m => m.role !== 'reader').map(m => opt(m.email, m.email === me() ? 'Me' : (m.name || m.email.split('@')[0]), t.assignee || '')).join('')}</select></div>
    <div class="field"><span class="lb">Added by</span><span style="font-size:14px">${esc(shName(t.sh, t.by) || '—')}</span></div>` : ''}
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
    <div class="bar"><button class="ib" data-act="close-sheet" aria-label="Back">${I.l}</button><span class="meta" id="n-meta">${noteMeta(n)}</span><span style="display:flex;gap:4px"><button class="ib nmic ${rec && rec.noteId === n.id ? 'on' : ''}" data-act="${rec ? 'rec-stop' : 'rec-start'}" aria-label="${rec ? 'Stop recording' : 'Record a voice note'}" title="${rec ? 'Stop recording' : 'Record'}">${rec ? '<i class="sq"></i>' : I.mic}</button><button class="ib" data-act="note-share" aria-label="Share note" title="Share">${I.share}</button><button class="ib" data-act="del-note" aria-label="Delete note">${I.trash}</button></span></div>
    ${noteToolsHTML(n)}
    <div class="body" id="n-body">
      <textarea id="n-title" class="wt" rows="1" dir="auto" placeholder="Title" aria-label="Title">${esc(n.title || '')}</textarea>
      <div class="rule"></div>
      ${voiceHTML(n)}
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
  ${sec('Google Tasks', `<div class="card"><div class="field"><span class="lb" style="color:var(--tx)">Sync with Google Tasks</span><button class="sw blue ${gtOn() ? 'on' : ''}" data-act="gt-toggle" role="switch" aria-checked="${gtOn()}" aria-label="Sync with Google Tasks"></button></div>
    ${gtOn() ? `<div class="field"><span class="lb">Status</span><span style="font-size:14px;text-align:end">${gtStatusHTML()}</span></div>` : ''}</div>
    <p class="mut" style="margin:10px 2px 0;font-size:13px;line-height:1.6">Two-way with your “My Tasks” list: tasks you add here appear in Google Tasks, and tasks added there — by you, or by voice with “Hey Google” — appear here. Ticking, dates and deleting sync both ways. Add #housing, #dorba… to a Google task to file it in that section.</p>
    ${gtOn() ? `<button class="btn full" style="margin-top:10px" data-act="gt-now">${I.sync} Sync Google Tasks now</button>` : ''}`)}
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
  if (INK_TABLET) { const n = db.notes[id]; if (n && !(n.audio || []).length) { try { ZeroNative.openInk(JSON.stringify(n)); return; } catch { } } }
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
    case 'proj-pdf': { const p = db.projects[ui.projectId]; if (p) exportProjectPdf(p); break; }
    case 'proj-share': if (db.projects[ui.projectId]) openSheet({ type: 'share' }); break;
    case 'sh-start': { const p = db.projects[ui.projectId]; if (!p) break; if (!authed()) { toast('Connect Google first'); break; }
      el.disabled = true; el.textContent = 'Sharing…';
      shCreate(p).then(r => { ui.projectId = r.project.id; LS.set('projectId', r.project.id); renderMain(); renderSheet(); toast('Shared — now add people'); })
        .catch(e => { console.error(e); toast('Couldn’t share — check your connection'); renderSheet(); }); break; }
    case 'sh-rm': { const p = db.projects[ui.projectId]; if (p && p.sh && confirm(`Remove ${el.dataset.email}? They lose access to this project.`)) shRemoveMember(p.sh, el.dataset.email).then(() => { renderSheet(); renderMain(); }).catch(() => toast('Couldn’t remove — try again')); break; }
    case 'sh-copy': { const p = db.projects[ui.projectId]; if (p && p.sh) copyText(`${JOIN_BASE}?join=${p.sh}`).then(ok => toast(ok ? 'Link copied' : 'Copy failed')); break; }
    case 'sh-send': { const p = db.projects[ui.projectId]; if (!p || !p.sh) break; const text = `Join “${p.name}” in Ctrl Z: ${JOIN_BASE}?join=${p.sh}`;
      if (NATIVE && ZeroNative.shareText) { try { ZeroNative.shareText(p.name, text); break; } catch { } }
      if (navigator.share) navigator.share({ title: p.name, text }).catch(() => { }); else copyText(text).then(ok => toast(ok ? 'Invite copied' : 'Copy failed')); break; }
    case 'sh-leave': { const p = db.projects[ui.projectId]; if (p && p.sh && confirm(`Leave “${p.name}”?`)) { const f = p.sh; closeSheetQuiet(); shLeave(f); go('shared'); } break; }
    case 'sh-pick': pickShared(ui.joinFid); break;
    case 'sh-link': { const p = db.projects[ui.projectId]; if (!p || !p.sh) break; const v = el.dataset.v || null;
      if (((SH[p.sh].data.link || {}).role || null) === v) break;
      if (v === 'writer' && !confirm('Anyone who gets this link will be able to edit the project. Continue?')) break;
      document.querySelectorAll('.lopt').forEach(b => b.disabled = true);
      shSetLink(p.sh, v).then(() => { toast(v ? 'Link is open' : 'Link closed'); renderSheet(); }).catch(e => { console.error(e); toast('Couldn’t change the link — try again'); renderSheet(); }); break; }
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
    case 'del-project': { const p = db.projects[ui.projectId];
      if (p && p.sh) {
        if (shRole(p.sh) === 'owner') { if (confirm(`Delete shared project “${p.name}” for everyone?`)) { upd(p, { deleted: true }); shSyncAll(); go('home'); } }
        else if (confirm(`Leave “${p.name}”? It disappears from your app; the others keep it.`)) { shLeave(p.sh); go('shared'); }
        break;
      }
      if (p && confirm(`Delete project “${p.name}”? Its tasks are kept without a project.`)) { tasks().filter(x => x.projectId === p.id).forEach(x => upd(x, { projectId: null, stageId: null, areaId: x.areaId || p.areaId || null })); upd(p, { deleted: true }); go(p.areaId || 'home'); } break; }
    case 'range': ui.rDays = +el.dataset.n; if (ui.rDays === 0 && !ui.rFrom) { const [f, to] = [addD(today(), -13), today()]; ui.rFrom = f; ui.rTo = to; } renderMain(); break;
    case 'copy-md': { const [f, to] = reviewRange(); copyText(buildMarkdown(reviewData(f, to))).then(ok => toast(ok ? 'Copied — paste it in a chat with Claude' : 'Copy failed')); break; }
    case 'save-md': saveReviewToDrive(); break;
    case 'dl-csv': { const [f, to] = reviewRange(); download(`zero-review-${f}-to-${to}.csv`, buildCSV(reviewData(f, to)), 'text/csv;charset=utf-8'); break; }
    case 'dl-json': { const [f, to] = reviewRange(); download(`zero-review-${f}-to-${to}.json`, buildJSON(reviewData(f, to)), 'application/json'); break; }
    case 'gt-toggle': {
      const on = !gtOn(); db.prefs = { ...db.prefs, gtasksOn: on, updatedAt: now() }; save();
      if (on) { LS.del('gtSince'); gtLast = 0; toast('Google Tasks sync is on'); gtSync(true).then(ch => { if (ch) scheduleSync(800); }); }
      renderSheet(); break;
    }
    case 'gt-allow': connect(true); break;
    case 'gt-now': gtLast = 0; gtSync(true).then(ch => { if (ch) scheduleSync(800); toast(gtErr ? 'Google Tasks: not synced' : 'Google Tasks synced'); }); renderSheet(); break;
    case 'rec-start': recStart(); break;
    case 'rec-share': { const n = ui.sheet && db.notes[ui.sheet.id]; if (n) shareClip(n, el.dataset.id); break; }
    case 'note-share': { const n = ui.sheet && db.notes[ui.sheet.id]; if (n) shareNote(n); break; }
    case 'rec-stop': recStop(); break;
    case 'rec-del': { const n = ui.sheet && db.notes[ui.sheet.id]; if (n && confirm('Delete this recording?')) { richSave(); removeClip(n, el.dataset.id); renderSheet(); } break; }
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
      const left = allTasks().filter(x => x.projectId === p.id && !x.done).length;
      if (left && !confirm(`${left} ${left === 1 ? 'task is' : 'tasks are'} still open in this project. Mark it completed anyway?`)) break;
      upd(p, { done: true, doneAt: new Date().toISOString() }); toast('Project completed'); renderMain(); break;
    }
    case 'focus': { const f = document.getElementById(el.dataset.f); if (f) { f.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => f.focus(), 250); } break; }
    case 'new-list': { const l = newList(el.dataset.area || 'personal', el.dataset.kind || 'list'); openSheet({ type: 'list', id: l.id }); setTimeout(() => { const i = $('#l-name'); if (i) i.focus(); }, 80); break; }
    case 'hopen': { if (db.lists[el.dataset.id]) { ui.hSel = ui.hSel || {}; ui.hSel[el.dataset.id] = null; ui.hMonth = ui.hMonth || {}; ui.hMonth[el.dataset.id] = null; openSheet({ type: 'list', id: el.dataset.id }); } break; }
    case 'hpick': { ui.hSel = ui.hSel || {}; ui.hSel[el.dataset.id] = el.dataset.d; renderSheet(); setTimeout(() => { const i = $('#hp-num'); if (i) i.focus(); }, 40); break; }
    case 'hset': { const l = db.lists[el.dataset.id]; const d = ui.hSel && ui.hSel[el.dataset.id]; if (!l || !d) break; const vals = { ...(l.vals || {}) }; if (el.dataset.v === '') delete vals[d]; else vals[d] = el.dataset.v === '1'; updList(l, { vals }); ui.hSel[l.id] = null; renderSheet(); renderMain(); break; }
    case 'hsave': habitSaveNum(el.dataset.id); break;
    case 'h-create': { const l = db.lists[el.dataset.id]; if (!l) break; const nm = $('#l-name'); const name = (nm ? nm.value : l.name || '').trim();
      if (!name) { toast('Give the habit a name first'); if (nm) nm.focus(); break; }
      const u = $('#h-unit'); updList(l, { name, unit: l.htype === 'num' && u ? u.value.trim() : (l.unit || ''), draft: false }); renderSheet(); renderMain(); break; }
    case 'proj-prio': { const p = db.projects[ui.projectId]; if (p) { upd(p, { priority: +el.dataset.v }); renderMain(); } break; }
    case 'hcell': {
      const l = db.lists[el.dataset.id]; if (!l) break; const d = el.dataset.d;
      if (l.htype === 'num') { ui.hSel = ui.hSel || {}; ui.hSel[l.id] = d; renderMain(); setTimeout(() => { const i = document.getElementById('hn-' + l.id); if (i) i.focus(); }, 30); break; }
      const v = hv(l, d), vals = { ...(l.vals || {}) };
      if (v === true) vals[d] = false; else if (v === false) delete vals[d]; else vals[d] = true;
      updList(l, { vals }); renderMain(); break;
    }
    case 'hmonth': { const l = db.lists[el.dataset.id]; if (!l) break; ui.hMonth = ui.hMonth || {}; const m = monthAdd(ui.hMonth[l.id] || today().slice(0, 7), +el.dataset.dir); ui.hMonth[l.id] = m >= today().slice(0, 7) ? null : m; if (ui.hSel) ui.hSel[l.id] = null; renderSheet(); break; }
    case 'hclear': { const l = db.lists[el.dataset.id]; if (!l) break; const vals = { ...(l.vals || {}) }; delete vals[el.dataset.d]; updList(l, { vals }); renderMain(); break; }
    case 'htype': { const l = db.lists[el.dataset.id]; if (!l) break; const v = el.dataset.v;
      /* keep what was recorded where it still makes sense */
      const vals = {}; Object.entries(l.vals || {}).forEach(([k, x]) => { if (v === 'num' ? typeof x === 'number' : typeof x === 'boolean') vals[k] = x; });
      if (Object.keys(l.vals || {}).length && Object.keys(vals).length < Object.keys(l.vals || {}).length && !confirm('Days recorded with the other type will be cleared. Switch?')) break;
      updList(l, { htype: v, vals }); renderSheet(); renderMain(); break; }
    case 'ndir-toggle': richDirToggle(); break;
    case 'nfmt': {
      /* folded: the first tap opens the three choices, the next tap picks one and folds them again */
      const g = el.closest('.ng.fold');
      if (g && !g.classList.contains('open')) { document.querySelectorAll('#ntools .ng.fold.open').forEach(x => x.classList.remove('open')); g.classList.add('open'); break; }
      const f = el.dataset.fmt; if (f === 'h1' || f === 'h2' || f === 'p') richBlock(f); else richWeight(f);
      if (g) g.classList.remove('open'); richToolsState(); break; }
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
  if (el.id === 'hp-num') { e.preventDefault(); const l = ui.sheet && ui.sheet.id; if (l) habitSaveNum(l); return; }
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
  if (kind === 'sh-add') {
    const p = db.projects[ui.projectId]; const em = (f.querySelector('#sh-email').value || '').trim(); const nm = f.querySelector('#sh-name').value; const rl = f.querySelector('#sh-role').value;
    if (!p || !p.sh || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { toast('Type their Gmail address'); return; }
    const b = f.querySelector('button[type=submit]'); if (b) { b.disabled = true; b.textContent = 'Adding…'; }
    shAddMember(p.sh, em, nm, rl).then(() => { toast('Invite sent to ' + em); renderSheet(); renderMain(); })
      .catch(e => { console.error(e); toast(/invalid|notFound|400/.test(String(e.message)) ? 'Google couldn’t find that account — check the address' : 'Couldn’t add — try again'); renderSheet(); });
    return;
  }
  if (kind === 'sh-join') { const v2 = (input.value || '').trim(); if (v2) { input.value = ''; shJoin(v2); } return; }
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
  if (p && el.id === 'proj-brief') { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; p.brief = el.value; p.updatedAt = now(); clearTimeout(typeT); typeT = setTimeout(save, 600); return; }
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
    if (el.id === 't-assignee') { upd(t, { assignee: el.value || null }); renderSheet(); renderMain(); return; }
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
    if (el.id === 'proj-area') { upd(p, { areaId: el.value || null }); allTasks().filter(x => x.projectId === p.id).forEach(x => upd(x, { areaId: el.value || null })); renderMain(); toast(el.value ? 'Moved to ' + areaOf(el.value).name : 'Removed from section'); return; }
    if (el.id === 'proj-name' || el.dataset.stage) { save(); renderMain(); return; }
    if (el.dataset.stageDue) { upd(p, { stages: p.stages.map(s => s.id === el.dataset.stageDue ? { ...s, due: el.value || null } : s) }); renderMain(); return; }
    if (el.dataset.stageStart) { upd(p, { stages: p.stages.map(s => s.id === el.dataset.stageStart ? { ...s, start: el.value || null } : s) }); renderMain(); return; }
    if (el.id === 'proj-brief') { save(); return; }
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
/* pick up tasks added in Google Tasks (or by Gemini / Google Assistant) while the app is open */
setInterval(() => { if (document.visibilityState === 'visible' && gtOn() && authed()) gtSync(true).then(ch => { if (ch) scheduleSync(800); }); }, 2 * 60e3);

/* board: drag cards between columns */
document.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('.kcard'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.kid); e.dataTransfer.effectAllowed = 'move'; c.classList.add('drag'); });
document.addEventListener('dragend', e => { const c = e.target.closest && e.target.closest('.kcard'); if (c) c.classList.remove('drag'); document.querySelectorAll('.kcol.over').forEach(x => x.classList.remove('over')); });
document.addEventListener('dragover', e => { const col = e.target.closest && e.target.closest('.kcol'); if (!col) return; e.preventDefault(); document.querySelectorAll('.kcol.over').forEach(x => x !== col && x.classList.remove('over')); col.classList.add('over'); });
document.addEventListener('drop', e => { const col = e.target.closest && e.target.closest('.kcol'); if (!col) return; e.preventDefault(); const t = db.tasks[e.dataTransfer.getData('text/plain')]; if (t && kcol(t) !== col.dataset.kcol) { kmove(t, col.dataset.kcol); renderMain(); } });

/* launch links from home-screen shortcuts and the widget: ?v=view  ?a=add|event  ?t=taskId  ?d=YYYY-MM-DD */
function handleLaunch() {
  const q = new URLSearchParams(location.search);
  if (![...q.keys()].length) return;
  if (q.get('join')) LS.set('pendingJoin', q.get('join'));
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

for (const f of shIds()) { if (SH[f].left) delete SH[f]; else shInject(f); }
setInterval(() => { if (document.visibilityState === 'visible' && authed() && shIds().length) shSyncAll(); }, 45e3);
renderMain(); renderSheet();
window.__zeroInkPull();
handleLaunch();
if (LS.get('signedIn', false)) { initAuth(); if (authed()) afterAuth(); else if (NATIVE) nativeAuth(false); }
else initAuth();
if (!NATIVE && 'serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
