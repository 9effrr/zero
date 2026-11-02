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
  zero: '<svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="17" fill="none" stroke="#EDEDED" stroke-width="7"/></svg>'
};

/* ---------------- data ---------------- */
const freshDb = () => ({ v: 1, tasks: {}, projects: {}, log: {}, prefs: { updatedAt: 0 } });
let db = LS.get('db', null) || freshDb();
if (!db.prefs) db.prefs = { updatedAt: 0 };

function persist() { LS.set('db', db); }
function save() { persist(); LS.set('dirty', true); scheduleSync(); }

const tasks = () => Object.values(db.tasks).filter(t => !t.deleted);
const projects = () => Object.values(db.projects).filter(p => !p.deleted).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
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
    project: projName(t.projectId), stage: stageName(t.projectId, t.stageId),
    due: t.due || null, repeat: t.repeat ? t.repeat.freq : null, urgent: !!t.urgent,
    ...extra, updatedAt: now()
  };
}
function newTask(p = {}) {
  const t = {
    id: uid(), title: '', notes: '', due: null, time: null, urgent: false, projectId: null, stageId: null,
    subtasks: [], links: [], repeat: null, done: false, doneAt: null, postponed: 0,
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
function newProject(name) {
  const p = { id: uid(), name, deadline: null, stages: [], createdAt: new Date().toISOString(), updatedAt: now(), deleted: false };
  db.projects[p.id] = p; save(); return p;
}
function findProject(name) {
  const n = name.toLowerCase().replace(/[\s_]+/g, '');
  return projects().find(p => p.name.toLowerCase().replace(/\s+/g, '') === n) ||
    projects().find(p => p.name.toLowerCase().replace(/\s+/g, '').startsWith(n));
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
    log: mergeMap(l.log, r.log),
    prefs: ((r.prefs && r.prefs.updatedAt) || 0) > ((l.prefs && l.prefs.updatedAt) || 0) ? r.prefs : (l.prefs || { updatedAt: 0 })
  };
}

/* ---------------- auth ---------------- */
let token = LS.get('token', null);
let tokenClient = null, waiters = [], authErr = false;
const authed = () => !!(token && token.exp > now() + 60e3);
function gisReady() {
  return new Promise(res => {
    const ok = () => window.google && google.accounts && google.accounts.oauth2;
    if (ok()) return res();
    const iv = setInterval(() => { if (ok()) { clearInterval(iv); res(); } }, 100);
  });
}
async function initAuth() {
  if (tokenClient) return;
  await gisReady();
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CFG.clientId, scope: CFG.scopes,
    callback: onToken, error_callback: onTokenErr
  });
}
function onToken(r) {
  if (r.error) { authErr = true; failWaiters(r.error); renderMain(); return; }
  const ok = google.accounts.oauth2.hasGrantedAllScopes(r,
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
function onTokenErr(e) { authErr = true; failWaiters((e && e.type) || 'auth'); renderMain(); }
function failWaiters(e) { const w = waiters; waiters = []; w.forEach(x => x.rej(new Error('auth:' + e))); }
async function connect(consent) {
  await initAuth();
  tokenClient.requestAccessToken({ prompt: consent ? 'consent' : '', login_hint: LS.get('email', '') || undefined });
}
function getToken() {
  if (authed()) return Promise.resolve(token.access_token);
  return Promise.reject(new Error('auth:expired'));
}
async function gfetch(url, opts = {}) {
  const t = await getToken();
  const r = await fetch(url, { ...opts, headers: { Authorization: 'Bearer ' + t, ...(opts.headers || {}) } });
  if (r.status === 401) { token = null; LS.del('token'); renderMain(); throw new Error('auth:401'); }
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
  try { if (token && window.google) google.accounts.oauth2.revoke(token.access_token, () => { }); } catch { }
  ['token', 'signedIn', 'email', 'fileId', 'folderId', 'db', 'cals', 'events', 'dirty', 'lastSync'].forEach(LS.del);
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
  const r = { title: '', due: null, time: null, urgent: false, project: null, repeat: null, isEvent: false };
  const take = (re, fn) => { const m = s.match(re); if (m) { s = s.replace(m[0], ' '); fn(m); return true; } return false; };
  if (/^\s*@/.test(s)) { r.isEvent = true; s = s.replace('@', ' '); }
  take(/\s#([^\s#]+)/, m => { r.project = m[1].replace(/_/g, ' '); });
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
  if (p.project) { const f = findProject(p.project); c.push(`<span class="chip">${f ? esc(f.name) : 'New project: ' + esc(p.project)}</span>`); }
  return c.length > 0 ? c.join('') : '';
}
function quickAdd(text, ctx = {}) {
  const p = parseQuick(text);
  if (!p.title) return false;
  if (p.isEvent) {
    openEventSheet(null, { title: p.title, date: p.due || ui.sel || today(), start: p.time || '09:00' });
    return true;
  }
  let projectId = ctx.projectId || null;
  if (p.project) { const f = findProject(p.project); projectId = f ? f.id : newProject(p.project).id; }
  let repeat = p.repeat || ctx.repeat || null;
  let due = p.due || ctx.due || null;
  if (repeat && !due) due = today();
  if (repeat && repeat.freq === 'monthly') repeat = { ...repeat, day: pd(due).getDate() };
  newTask({ title: p.title, due, time: p.time, urgent: p.urgent, projectId, stageId: ctx.stageId || null, repeat });
  toast(due ? 'Added · ' + relDay(due) : 'Added');
  return true;
}

/* ---------------- UI state ---------------- */
const ui = {
  view: LS.get('view', 'home'), month: today().slice(0, 7), sel: today(), projectId: null,
  sheet: null, qa: '', rDays: 14, rFrom: null, rTo: null, rEvents: null, rKey: '', showDone: false
};
if (!['home', 'tasks', 'repeat', 'projects', 'review'].includes(ui.view)) ui.view = 'home';

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
  const pn = projName(t.projectId);
  if (pn) m.push(esc(pn + (t.stageId && stageName(t.projectId, t.stageId) ? ' › ' + stageName(t.projectId, t.stageId) : '')));
  const st = t.subtasks || [];
  if (st.length) m.push(`${st.filter(s => s.done).length}/${st.length}`);
  if (t.repeat) m.push(`<span style="display:inline-flex;align-items:center;gap:3px">${I.rep}${repLabel(t.repeat)}</span>`);
  if (t.notes && t.notes.trim()) m.push(I.note);
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
  return `<section class="sec"><div class="sec-h"><h2 class="${o.cls || ''}">${esc(title)}</h2>${o.right || ''}</div>${body}</section>`;
}
function syncDot() { return `<span class="sync-dot ${({ ok: 'ok', busy: 'busy', err: 'err' }[syncState] || '')}"></span>`; }

/* ---------------- shell ---------------- */
function welcomeHTML() {
  return `<div class="welcome">
    <img class="brand-logo" src="logo.png" alt="Zerodocs" width="150" height="91">
    <h1>Zerodocs control</h1>
    <p>Your calendar, tasks and projects in one quiet place. Everything is stored in your own Google Drive.</p>
    <button class="btn pri" data-act="connect-first">Connect Google</button>
    <p style="font-size:12px">Google will ask to allow Zerodocs control to see and edit your calendar events and the files it creates in your Drive.</p>
  </div>`;
}
function sideHTML() {
  const open = tasks().filter(t => !t.done && t.due && t.due <= today()).length;
  const nav = (v, label, extra = '') => `<button class="nav ${ui.view === v && (v !== 'projects' || !ui.projectId) ? 'on' : ''}" data-act="nav" data-v="${v}">${label}${extra}</button>`;
  return `<nav class="side" aria-label="Main">
    <div class="brand"><img src="logo.png" alt="Zerodocs control" width="66" height="40" class="side-logo"> <button class="ib" data-act="settings" aria-label="Settings">${I.gear}</button></div>
    ${nav('home', 'Calendar')}
    ${nav('tasks', 'Tasks', open ? `<span class="c">${open}</span>` : '')}
    ${nav('repeat', 'Repeating')}
    ${nav('review', 'Review')}
    <div class="grp">PROJECTS</div>
    ${projects().map(p => `<button class="nav ${ui.view === 'projects' && ui.projectId === p.id ? 'on' : ''}" data-act="open-project" data-id="${esc(p.id)}"><span dir="auto" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</span></button>`).join('')}
    <button class="nav ${ui.view === 'projects' && !ui.projectId ? 'on' : ''}" data-act="nav" data-v="projects">+ New project</button>
    <div class="foot">${syncDot()}<span style="overflow:hidden;text-overflow:ellipsis">${esc(LS.get('email', '') || 'Not connected')}</span></div>
  </nav>`;
}
function qaHTML(id) {
  return `<label class="qa"><span class="sr">Quick add</span>
    <input id="${id}" data-enter="qa" autocomplete="off" enterkeyhint="done" placeholder="Add… e.g. مونتاج غداً ٤م #promo" value="${esc(ui.qa)}">
    <button class="go" data-act="qa-go" data-for="${id}" aria-label="Add">${I.plus}</button></label>
    <div class="qa-prev" id="${id}-prev">${qaPreview(ui.qa)}</div>`;
}
function bottomHTML() {
  const tab = (v, l) => `<button class="${ui.view === v ? 'on' : ''}" data-act="nav" data-v="${v}">${l}</button>`;
  return `<nav class="bottom" aria-label="Main">${qaHTML('qa-m')}<div class="tabs">${tab('home', 'Home')}${tab('tasks', 'Tasks')}${tab('repeat', 'Repeat')}${tab('projects', 'Projects')}${tab('review', 'Review')}</div></nav>`;
}
function bannerHTML() {
  if (!navigator.onLine) return `<div class="card" style="padding:10px 14px;margin-bottom:14px;font-size:13px;color:var(--mut)">Offline — your changes are saved on this device and will sync when you're back online.</div>`;
  if (!authed()) return `<div class="card" style="padding:8px 8px 8px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px"><span class="mut">Google session paused.</span><button class="pill" data-act="connect">Reconnect</button></div>`;
  return '';
}
function renderMain() {
  const app = $('#app');
  if (!LS.get('signedIn', false)) { app.innerHTML = welcomeHTML(); return; }
  const a = document.activeElement;
  const keep = a && a.id && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && !a.closest('.sheet') ? { id: a.id, v: a.value, s: a.selectionStart, e: a.selectionEnd } : null;
  app.innerHTML = `<div class="shell">${sideHTML()}<main class="main" id="main"><div class="mob-top"><img src="logo.png" alt="Zerodocs control" width="52" height="32" class="mob-logo"></div>${bannerHTML()}<div class="qa-top">${qaHTML('qa-d')}</div>${viewHTML()}</main>${bottomHTML()}</div>`;
  if (keep) { const el = document.getElementById(keep.id); if (el) { el.value = keep.v; el.focus(); try { el.setSelectionRange(keep.s, keep.e); } catch { } } }
}
function softRender() {
  const a = document.activeElement;
  if (a && a.closest && a.closest('.sheet') && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) { renderMain(); return; }
  renderMain(); if (ui.sheet && ui.sheet.type !== 'event') renderSheet();
}
function viewHTML() {
  switch (ui.view) {
    case 'tasks': return tasksView();
    case 'repeat': return repeatView();
    case 'projects': return ui.projectId && db.projects[ui.projectId] && !db.projects[ui.projectId].deleted ? projectView(db.projects[ui.projectId]) : projectsView();
    case 'review': return reviewView();
    default: return homeView();
  }
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
  return `<div class="home">
    <div class="left">
      <div class="hdr">
        <h1>${first.toLocaleDateString('en-GB', { month: 'long' })} <span>${first.getFullYear()}</span></h1>
        <div class="row">
          ${notThisMonth ? '<button class="pill" data-act="today">Today</button>' : ''}
          <button class="ib" data-act="prev" aria-label="Previous month">${I.l}</button>
          <button class="ib" data-act="next" aria-label="Next month">${I.r}</button>
          <button class="ib mob" data-act="settings" aria-label="Settings">${I.gear}</button>
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
      ${urgent.length ? sec('Urgent', urgent.map(t => taskHTML(t)).join(''), { cls: 'or' }) : ''}
    </div>
  </div>`;
}
function tasksView() {
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
  let html = `<div class="narrow"><div class="hdr"><div><div class="sub">${open.length} open</div><h1>Tasks</h1></div><button class="ib mob" data-act="settings" aria-label="Settings">${I.gear}</button></div>`;
  let any = false;
  groups.forEach(([n, list, cls]) => { if (list.length) { any = true; html += sec(n, list.map(t => taskHTML(t, { hideDue: n === 'Today' })).join(''), { cls, right: `<span class="mut">${list.length}</span>` }); } });
  if (!any) html += '<div class="empty" style="padding-top:20px">All clear. Add a task below.</div>';
  const since = addD(td, -14);
  const done = tasks().filter(t => t.done && t.doneAt && isoDay(t.doneAt) >= since).sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1));
  if (done.length) {
    html += `<section class="sec"><div class="sec-h"><h2>Completed · last 14 days</h2><button class="pill" data-act="show-done">${ui.showDone ? 'Hide' : 'Show ' + done.length}</button></div>${ui.showDone ? done.map(t => taskHTML(t)).join('') : ''}</section>`;
  }
  return html + '</div>';
}
function repeatView() {
  const list = tasks().filter(t => t.repeat).sort(byDue);
  const groups = { daily: [], weekly: [], monthly: [], yearly: [] };
  list.forEach(t => (groups[t.repeat.freq] || groups.monthly).push(t));
  let html = `<div class="narrow"><div class="hdr"><div><div class="sub">Tasks that come back</div><h1>Repeating</h1></div></div>
    <div class="card" style="padding:0 14px"><div class="inline-add">${I.plusS}<input id="rep-new" data-enter="rep" dir="auto" placeholder="New… e.g. دفع الإيجار كل شهر 1/12"></div></div>
    <p class="mut" style="font-size:12px;margin:8px 2px 0">Monthly is the default. Write كل يوم / كل أسبوع / كل سنة to change it.</p>`;
  [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly']].forEach(([k, n]) => {
    if (groups[k].length) html += sec(n, groups[k].map(t => taskHTML(t, { })).join(''));
  });
  if (!list.length) html += '<div class="empty" style="padding-top:20px">No repeating tasks yet.</div>';
  return html + '</div>';
}
function projStats(p) {
  const ts = tasks().filter(t => t.projectId === p.id);
  const done = ts.filter(t => t.done).length;
  return { total: ts.length, done, open: ts.length - done, pct: ts.length ? Math.round(done / ts.length * 100) : 0 };
}
function projectsView() {
  const ps = projects();
  let html = `<div class="narrow"><div class="hdr"><div><div class="sub">${ps.length} active</div><h1>Projects</h1></div></div>
    <div class="card" style="padding:0 14px;margin-bottom:14px"><div class="inline-add">${I.plusS}<input id="proj-new" data-enter="proj" dir="auto" placeholder="New project name"></div></div><div class="plist">`;
  ps.forEach(p => {
    const s = projStats(p);
    html += `<button class="card pcard" data-act="open-project" data-id="${esc(p.id)}">
      <span style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><span class="nm" dir="auto">${esc(p.name)}</span><span class="mut" style="font-size:12px">${p.deadline ? 'Due ' + esc(shortDay(p.deadline)) : ''}</span></span>
      <span class="prog"><i style="width:${s.pct}%"></i></span>
      <span class="mut" style="font-size:12px">${s.done} of ${s.total} done${(p.stages || []).length ? ' · ' + p.stages.length + ' stages' : ''}</span></button>`;
  });
  if (!ps.length) html += '<div class="empty">No projects yet. A project groups tasks into stages, like Pre-production → Editing → Delivery.</div>';
  return html + '</div></div>';
}
function projectView(p) {
  const s = projStats(p);
  const ts = tasks().filter(t => t.projectId === p.id);
  const sortT = list => [...list.filter(t => !t.done).sort(byDue), ...list.filter(t => t.done)];
  const name = p.name.toLowerCase();
  const linked = unionEvents().filter(e => e.title.toLowerCase().includes(name) && evDays(e).slice(-1)[0] >= today()).slice(0, 5);
  const stageBlock = (st) => {
    const list = sortT(ts.filter(t => (st ? t.stageId === st.id : !t.stageId || !(p.stages || []).some(x => x.id === t.stageId))));
    const doneN = list.filter(t => t.done).length;
    const head = st
      ? `<div class="stage-h"><input id="st-${esc(st.id)}" data-stage="${esc(st.id)}" dir="auto" value="${esc(st.name)}" aria-label="Stage name"><span class="mut num" style="font-size:12px;white-space:nowrap">${doneN}/${list.length}</span><input type="date" id="std-${esc(st.id)}" data-stage-due="${esc(st.id)}" value="${esc(st.due || '')}" aria-label="Stage due date" style="background:transparent;border:0;color:var(--mut);font-size:12px;color-scheme:dark;width:118px"><button class="ib" data-act="del-stage" data-sid="${esc(st.id)}" aria-label="Delete stage">${I.x}</button></div>`
      : `<div class="stage-h"><span style="font-size:15px;font-weight:600;padding:4px 0">${(p.stages || []).length ? 'Other' : 'Tasks'}</span><span class="mut num" style="font-size:12px">${doneN}/${list.length}</span></div>`;
    if (!st && !list.length && (p.stages || []).length) return '';
    return `<div class="stage">${head}${list.map(t => taskHTML(t)).join('')}
      <div class="inline-add">${I.plusS}<input id="add-${st ? esc(st.id) : 'none'}" data-enter="stage" data-sid="${st ? esc(st.id) : ''}" dir="auto" placeholder="Add task${st ? ' to ' + esc(st.name) : ''}…"></div></div>`;
  };
  return `<div class="narrow">
    <div class="hdr" style="margin-bottom:8px"><button class="pill" data-act="nav" data-v="projects" style="display:inline-flex;align-items:center;gap:4px;padding-left:8px">${I.l} Projects</button><button class="ib" data-act="del-project" aria-label="Delete project">${I.trash}</button></div>
    <input id="proj-name" class="title-in" style="font-size:28px" dir="auto" value="${esc(p.name)}" aria-label="Project name">
    <div style="display:flex;align-items:center;gap:10px;margin:10px 0 12px;flex-wrap:wrap;font-size:13px" class="mut">
      <span>${s.done} of ${s.total} done</span><span>·</span>
      <label style="display:flex;align-items:center;gap:6px">Deadline <input type="date" id="proj-deadline" value="${esc(p.deadline || '')}" style="background:transparent;border:0;color:var(--tx);color-scheme:dark;font-size:13px"></label>
    </div>
    <div class="prog"><i style="width:${s.pct}%"></i></div>
    ${linked.length ? sec('Linked events', linked.map(evHTML).join('')) : ''}
    ${(p.stages || []).map(stageBlock).join('')}
    ${stageBlock(null)}
    <div style="margin-top:22px"><button class="dash" style="width:100%" data-act="add-stage">+ Add stage</button></div>
  </div>`;
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
function reviewData(from, to) {
  const inR = iso => { const d = isoDay(iso); return d >= from && d <= to; };
  const logs = Object.values(db.log).filter(l => inR(l.at)).sort((a, b) => (a.at < b.at ? -1 : 1));
  const undone = new Set(logs.filter(l => l.type === 'undone').map(l => l.taskId));
  const done = logs.filter(l => l.type === 'done' && (l.repeat || !undone.has(l.taskId) || (db.tasks[l.taskId] && db.tasks[l.taskId].done)));
  const created = logs.filter(l => l.type === 'created');
  const postponed = logs.filter(l => l.type === 'postponed');
  const late = done.filter(l => l.late > 0);
  const avgLate = late.length ? (late.reduce((a, l) => a + l.late, 0) / late.length) : 0;
  const stillOpen = tasks().filter(t => !t.done && t.due && t.due >= from && t.due <= to);
  const plannedDone = done.filter(l => l.due && l.due >= from && l.due <= to).length;
  const planned = plannedDone + stillOpen.length;
  const rep = done.filter(l => l.repeat);
  const events = (ui.rEvents || []).filter(e => evDays(e).some(d => d >= from && d <= to));
  let mins = 0;
  events.forEach(e => { if (!e.allDay) mins += Math.max(0, (new Date(e.end) - new Date(e.start)) / 6e4); });
  const byP = {};
  const P = n => byP[n] || (byP[n] = { done: 0, open: 0, events: 0 });
  done.forEach(l => P(l.project || 'No project').done++);
  stillOpen.forEach(t => P(projName(t.projectId) || 'No project').open++);
  events.forEach(e => { const p = projects().find(p => e.title.toLowerCase().includes(p.name.toLowerCase())); if (p) P(p.name).events++; });
  return { from, to, logs, done, created, postponed, late, avgLate, stillOpen, planned, plannedDone, rep, events, hours: mins / 60, byP };
}
function reviewView() {
  const [from, to] = reviewRange();
  ensureReviewEvents(from, to);
  const r = reviewData(from, to);
  const loading = ui.rEvents === null;
  const seg = (n, l) => `<button class="${ui.rDays === n ? 'on' : ''}" data-act="range" data-n="${n}" aria-pressed="${ui.rDays === n}">${l}</button>`;
  const stat = (k, v, s, cls = '') => `<div class="card stat"><span class="k">${k}</span><span class="v ${cls}">${v}</span><span class="s">${s}</span></div>`;
  const pEntries = Object.entries(r.byP).sort((a, b) => (b[1].done + b[1].open) - (a[1].done + a[1].open));
  const max = Math.max(1, ...pEntries.map(([, v]) => v.done + v.open));
  return `<div class="narrow">
    <div class="hdr"><div><div class="sub">${esc(shortDay(from))} – ${esc(shortDay(to))} · ${diffD(from, to) + 1} days</div><h1>Review</h1></div></div>
    <div class="seg" role="group" aria-label="Range">${seg(7, '7 days')}${seg(14, '14 days')}${seg(30, '30 days')}${seg(0, 'Custom')}</div>
    ${ui.rDays === 0 ? `<div class="card" style="margin-top:10px"><div class="field"><label for="r-from">From</label><input type="date" id="r-from" value="${esc(from)}"></div><div class="field"><label for="r-to">To</label><input type="date" id="r-to" value="${esc(to)}"></div></div>` : ''}
    <div class="stats" style="margin-top:16px">
      ${stat('Tasks done', r.done.length, r.planned ? `${r.plannedDone} of ${r.planned} planned in range` : 'nothing planned in range')}
      ${stat('Meetings & events', loading ? '…' : r.events.length, loading ? 'loading calendar' : `${r.hours.toFixed(1)} h in calendar`)}
      ${stat('Done late', r.late.length, r.late.length ? `avg ${r.avgLate.toFixed(1)} days late` : 'none', r.late.length ? 'or' : '')}
      ${stat('Repeating on time', `${r.rep.filter(l => !l.late).length}/${r.rep.length}`, 'repeat completions')}
    </div>
    <p class="mut" style="font-size:13px;margin:12px 2px 0">${r.created.length} created · ${r.postponed.length} postponements · ${r.stillOpen.length} still open from this period</p>
    ${pEntries.length ? sec('By project', `<div class="bars">${pEntries.map(([n, v]) => `<div><div class="l"><span dir="auto">${esc(n)}</span><span class="mut">${v.done} done · ${v.open} open${v.events ? ' · ' + v.events + ' events' : ''}</span></div><div class="t"><i style="width:${Math.round((v.done + v.open) / max * 100)}%"></i></div></div>`).join('')}</div>`) : ''}
    ${sec('Export full summary', `<p class="mut" style="margin:0 0 12px;font-size:13px;line-height:1.55">Every task and event in the range: created, due and done times, project, priority, notes, subtasks, repeats and postponements.</p>
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
  const pn = projName(t.projectId); if (pn) bits.push(pn + (t.stageId && stageName(t.projectId, t.stageId) ? ' › ' + stageName(t.projectId, t.stageId) : ''));
  if (t.due) bits.push('due ' + t.due + (t.time ? ' ' + t.time : ''));
  if (t.urgent) bits.push('urgent');
  if (t.repeat) bits.push('repeats ' + t.repeat.freq);
  if (t.postponed) bits.push('postponed ' + t.postponed + 'x');
  const st = t.subtasks || []; if (st.length) bits.push(`subtasks ${st.filter(s => s.done).length}/${st.length}`);
  return `- ${t.title}${bits.length ? ' — ' + bits.join(', ') : ''}`;
}
function buildMarkdown(r) {
  const L = [];
  L.push(`# Zerodocs control review: ${r.from} → ${r.to}`, '', `Generated ${new Date().toLocaleString('en-GB')} (${TZ}).`, '');
  L.push('## Summary');
  L.push(`- Tasks completed: ${r.done.length} (${r.plannedDone} of ${r.planned} tasks that were due in this period)`);
  L.push(`- Completed late: ${r.late.length}${r.late.length ? ` (average ${r.avgLate.toFixed(1)} days late)` : ''}`);
  L.push(`- Tasks created: ${r.created.length} · Postponements: ${r.postponed.length} · Still open from this period: ${r.stillOpen.length}`);
  L.push(`- Calendar: ${r.events.length} events, ${r.hours.toFixed(1)} hours of timed events`);
  L.push(`- Repeating tasks: ${r.rep.filter(l => !l.late).length}/${r.rep.length} completions on time`, '');
  const pE = Object.entries(r.byP);
  if (pE.length) { L.push('## By project'); pE.forEach(([n, v]) => L.push(`- ${n}: ${v.done} done, ${v.open} open, ${v.events} related events`)); L.push(''); }
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
  const open = tasks().filter(t => !t.done).sort(byDue);
  L.push('', `## Open tasks today (${open.length})`);
  open.forEach(t => {
    L.push(taskLine(t));
    if (t.notes && t.notes.trim()) L.push(`  Notes: ${t.notes.trim().replace(/\n+/g, ' / ')}`);
    (t.subtasks || []).forEach(s => L.push(`  - [${s.done ? 'x' : ' '}] ${s.title}`));
  });
  const ps = projects();
  if (ps.length) {
    L.push('', '## Projects');
    ps.forEach(p => { const s = projStats(p); L.push(`- ${p.name}: ${s.done}/${s.total} done${p.deadline ? ', deadline ' + p.deadline : ''}${(p.stages || []).length ? ', stages: ' + p.stages.map(x => x.name + (x.due ? ' (' + x.due + ')' : '')).join(' → ') : ''}`); });
  }
  return L.join('\n');
}
function csvCell(v) { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function buildCSV(r) {
  const rows = [['kind', 'date', 'time', 'title', 'project', 'stage', 'due', 'done_at', 'late_days', 'urgent', 'repeat', 'postponed', 'from', 'to', 'location', 'calendar', 'notes']];
  r.events.forEach(e => rows.push(['event', e.allDay ? e.start : isoDay(e.start), e.allDay ? 'all day' : hm(e.start) + '-' + hm(e.end), e.title, '', '', '', '', '', '', e.recurring ? 'yes' : '', '', '', '', e.location, e.calName, e.desc.replace(/\s+/g, ' ').slice(0, 500)]));
  r.logs.filter(l => ['done', 'created', 'postponed'].includes(l.type)).forEach(l => {
    if (l.type === 'done' && !r.done.includes(l)) return;
    const t = db.tasks[l.taskId];
    rows.push([l.type, isoDay(l.at), hm(l.at), l.title, l.project, l.stage, l.due, l.type === 'done' ? l.at : '', l.late || '', l.urgent ? 'yes' : '', l.repeat || '', t ? t.postponed || 0 : '', l.from || '', l.to || '', '', '', t ? (t.notes || '').replace(/\s+/g, ' ') : '']);
  });
  tasks().filter(t => !t.done).forEach(t => rows.push(['open', today(), t.time || '', t.title, projName(t.projectId), stageName(t.projectId, t.stageId), t.due || '', '', t.due && t.due < today() ? diffD(t.due, today()) : '', t.urgent ? 'yes' : '', t.repeat ? t.repeat.freq : '', t.postponed || 0, '', '', '', '', (t.notes || '').replace(/\s+/g, ' ')]));
  return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
}
function buildJSON(r) {
  return JSON.stringify({ range: { from: r.from, to: r.to, timezone: TZ }, generated: new Date().toISOString(), events: r.events, log: r.logs, tasks: tasks(), projects: projects() }, null, 2);
}
function download(name, text, mime) {
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
  if (history.state && history.state.zsheet) history.back();
  else { ui.sheet = null; renderSheet(); renderMain(); }
}
window.addEventListener('popstate', () => { if (ui.sheet) { ui.sheet = null; renderSheet(); renderMain(); } });
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
  const sc = $('.sheet', root); const top = sc ? sc.scrollTop : 0;
  root.innerHTML = `<div class="sheet-bg" data-act="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${s.type}">${inner}</div>`;
  const nsc = $('.sheet', root); if (nsc) nsc.scrollTop = top;
  autoGrow();
}
function autoGrow() { document.querySelectorAll('textarea.title-in').forEach(el => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }); }
function taskSheet(t) {
  const ps = projects(); const p = t.projectId && db.projects[t.projectId];
  const stages = p ? p.stages || [] : [];
  const crumb = projName(t.projectId) ? projName(t.projectId) + (t.stageId && stageName(t.projectId, t.stageId) ? ' › ' + stageName(t.projectId, t.stageId) : '') : (t.repeat ? 'Repeating' : 'Task');
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
    <div class="field"><label for="t-project">Project</label><select id="t-project">${opt('', 'None', t.projectId || '')}${ps.map(x => opt(x.id, x.name, t.projectId)).join('')}</select></div>
    ${stages.length ? `<div class="field"><label for="t-stage">Stage</label><select id="t-stage">${opt('', '—', t.stageId || '')}${stages.map(x => opt(x.id, x.name, t.stageId)).join('')}</select></div>` : ''}
  </div>
  <div class="quick">${[['Today', today()], ['Tomorrow', addD(today(), 1)], ['Next week', addD(today(), 7)]].map(([l, v]) => `<button class="chip" data-act="due-quick" data-v="${v}">${l}</button>`).join('')}${t.due ? '<button class="chip" data-act="due-quick" data-v="">No date</button>' : ''}</div>
  ${sec('Subtasks', `${(t.subtasks || []).map(s => `<div class="sub ${s.done ? 'on' : ''}"><button class="box ${s.done ? 'on' : ''}" data-act="sub-toggle" data-sid="${esc(s.id)}" aria-label="Toggle subtask">${s.done ? I.check : ''}</button><input id="s-${esc(s.id)}" data-sub="${esc(s.id)}" dir="auto" value="${esc(s.title)}" aria-label="Subtask"><button class="ib x" data-act="sub-del" data-sid="${esc(s.id)}" aria-label="Delete subtask">${I.x}</button></div>`).join('')}
    <div class="inline-add">${I.plusS}<input id="s-new" data-enter="sub" dir="auto" placeholder="Add subtask"></div>`, { right: (t.subtasks || []).length ? `<span class="mut">${(t.subtasks || []).filter(s => s.done).length} of ${(t.subtasks || []).length}</span>` : '' })}
  ${sec('Notes', `<textarea id="t-notes" class="ta" dir="auto" placeholder="Details, ideas, anything…">${esc(t.notes || '')}</textarea>`)}
  ${sec('Links', `${(t.links || []).map((l, i) => `<div style="display:flex;align-items:center;gap:8px;min-height:40px"><a href="${esc(l)}" target="_blank" rel="noopener" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;text-decoration:none;display:flex;align-items:center;gap:8px">${I.link}${esc(l.replace(/^https?:\/\//, ''))}</a><button class="ib" data-act="link-del" data-i="${i}" aria-label="Remove link">${I.x}</button></div>`).join('')}
    <div class="inline-add">${I.plusS}<input id="l-new" data-enter="link" type="url" inputmode="url" placeholder="Paste a link"></div>`)}
  <p class="mut" style="font-size:12px;margin-top:26px">Created ${esc(new Date(t.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}${t.postponed ? ` · postponed ${t.postponed}×` : ''}${t.doneAt ? ` · done ${esc(new Date(t.doneAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}` : ''}</p>`;
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
  ${sec('Install', deferredPrompt ? '<button class="btn full" data-act="install">Install Zerodocs control on this device</button>' : '<p class="mut" style="margin:0;font-size:13px;line-height:1.6">Chrome on Android: menu ⋮ › Add to Home screen / Install app. Chrome on Mac: the install icon in the address bar, or menu › Cast, save and share › Install page as app.</p>')}
  ${sec('Quick add tips', `<p class="mut" style="margin:0;font-size:13px;line-height:1.8" dir="auto">غداً · بعد غد · الخميس · 15/11 · بعد 3 أيام · ٤م · 16:30 · عاجل أو ! · #مشروع · كل شهر / كل أسبوع / كل يوم<br>Start with @ (or اجتماع + time) to create a Google Calendar event.<br>Press N on a keyboard to jump to quick add.</p>`)}
  <button class="btn danger full" style="margin-top:26px" data-act="signout">Sign out on this device</button>`;
}

/* ---------------- interaction ---------------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });

function go(view) { ui.view = view; LS.set('view', view); if (view !== 'projects') ui.projectId = null; renderMain(); window.scrollTo(0, 0); }
function setMonth(m) { ui.month = m; renderMain(); refreshMonth(m); }
function monthAdd(m, n) { const d = pd(m + '-01'); d.setMonth(d.getMonth() + n); return ymd(d).slice(0, 7); }
function curTask() { return ui.sheet && ui.sheet.type === 'task' ? db.tasks[ui.sheet.id] : null; }

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act; const t = curTask();
  switch (a) {
    case 'connect-first': connect(true); break;
    case 'connect': connect(false); break;
    case 'nav': if (a === 'nav' && el.dataset.v === 'projects') ui.projectId = null; go(el.dataset.v); break;
    case 'pick': ui.sel = el.dataset.d; if (ui.sel.slice(0, 7) !== ui.month) setMonth(ui.sel.slice(0, 7)); else renderMain(); break;
    case 'prev': setMonth(monthAdd(ui.month, -1)); break;
    case 'next': setMonth(monthAdd(ui.month, 1)); break;
    case 'today': ui.sel = today(); setMonth(today().slice(0, 7)); break;
    case 'toggle': { const x = db.tasks[el.dataset.id]; if (x) { toggleDone(x); renderMain(); if (ui.sheet) renderSheet(); } break; }
    case 'open-task': if (db.tasks[el.dataset.id] && !db.tasks[el.dataset.id].deleted) openSheet({ type: 'task', id: el.dataset.id }); break;
    case 'open-ev': { const ev = findEv(el.dataset.k); if (ev) openEventSheet(ev); break; }
    case 'new-event': openEventSheet(null, { date: el.dataset.d }); break;
    case 'new-task': { const x = newTask({ due: el.dataset.d || null }); openSheet({ type: 'task', id: x.id, fresh: true }); setTimeout(() => { const i = $('#t-title'); if (i) i.focus(); }, 60); break; }
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
    case 'open-project': ui.projectId = el.dataset.id; ui.view = 'projects'; LS.set('view', 'projects'); renderMain(); window.scrollTo(0, 0); break;
    case 'add-stage': { const p = db.projects[ui.projectId]; if (p) { const st = { id: uid(), name: 'New stage', due: null }; upd(p, { stages: [...(p.stages || []), st] }); renderMain(); setTimeout(() => { const i = document.getElementById('st-' + st.id); if (i) { i.focus(); i.select(); } }, 30); } break; }
    case 'del-stage': { const p = db.projects[ui.projectId]; if (p && confirm('Delete this stage? Its tasks stay in the project.')) { tasks().filter(x => x.stageId === el.dataset.sid).forEach(x => upd(x, { stageId: null })); upd(p, { stages: p.stages.filter(s => s.id !== el.dataset.sid) }); renderMain(); } break; }
    case 'del-project': { const p = db.projects[ui.projectId]; if (p && confirm(`Delete project “${p.name}”? Its tasks are kept without a project.`)) { tasks().filter(x => x.projectId === p.id).forEach(x => upd(x, { projectId: null, stageId: null })); upd(p, { deleted: true }); ui.projectId = null; renderMain(); } break; }
    case 'range': ui.rDays = +el.dataset.n; if (ui.rDays === 0 && !ui.rFrom) { const [f, to] = [addD(today(), -13), today()]; ui.rFrom = f; ui.rTo = to; } renderMain(); break;
    case 'copy-md': { const [f, to] = reviewRange(); copyText(buildMarkdown(reviewData(f, to))).then(ok => toast(ok ? 'Copied — paste it in a chat with Claude' : 'Copy failed')); break; }
    case 'save-md': saveReviewToDrive(); break;
    case 'dl-csv': { const [f, to] = reviewRange(); download(`zero-review-${f}-to-${to}.csv`, buildCSV(reviewData(f, to)), 'text/csv;charset=utf-8'); break; }
    case 'dl-json': { const [f, to] = reviewRange(); download(`zero-review-${f}-to-${to}.json`, buildJSON(reviewData(f, to)), 'application/json'); break; }
    case 'sync-now': if (!authed()) { connect(false); } else { sync(); refreshMonth(ui.month, true); loadCals().catch(() => { }); toast('Syncing…'); } break;
    case 'signout': signOut(); break;
    case 'cal-toggle': { const h = new Set(db.prefs.hiddenCals || []); h.has(el.dataset.id) ? h.delete(el.dataset.id) : h.add(el.dataset.id); db.prefs = { ...db.prefs, hiddenCals: [...h], updatedAt: now() }; save(); renderSheet(); renderMain(); refreshMonth(ui.month, true); break; }
    case 'install': if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.finally(() => { deferredPrompt = null; renderSheet(); }); } break;
    case 'show-done': ui.showDone = !ui.showDone; renderMain(); break;
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
  if (quickAdd(v)) { ui.qa = ''; input.value = ''; document.querySelectorAll('.qa input').forEach(x => { x.value = ''; }); document.querySelectorAll('.qa-prev').forEach(x => { x.innerHTML = ''; }); renderMain(); }
}
document.addEventListener('keydown', e => {
  const el = e.target;
  if (e.key === 'Escape' && ui.sheet) { closeSheet(); return; }
  if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !/INPUT|TEXTAREA|SELECT/.test(el.tagName) && !ui.sheet) {
    const i = window.innerWidth >= 900 ? $('#qa-d') : $('#qa-m'); if (i) { e.preventDefault(); i.focus(); } return;
  }
  if (e.key !== 'Enter' || e.isComposing) return;
  const k = el.dataset && el.dataset.enter;
  if (el.id === 't-title' || el.id === 'ev-title') { e.preventDefault(); el.blur(); return; }
  if (!k) return;
  e.preventDefault();
  const v = el.value.trim(); const t = curTask();
  if (k === 'qa') submitQA(el);
  else if (k === 'sub' && t && v) { upd(t, { subtasks: [...(t.subtasks || []), { id: uid(), title: v, done: false }] }); renderSheet(); renderMain(); setTimeout(() => { const i = $('#s-new'); if (i) i.focus(); }, 20); }
  else if (k === 'link' && t && v) { const url = /^https?:\/\//i.test(v) ? v : 'https://' + v; upd(t, { links: [...(t.links || []), url] }); renderSheet(); }
  else if (k === 'stage' && v) { quickAdd(v, { projectId: ui.projectId, stageId: el.dataset.sid || null }); renderMain(); setTimeout(() => { const i = document.getElementById(el.id); if (i) i.focus(); }, 20); }
  else if (k === 'proj' && v) { const p = newProject(v); ui.projectId = p.id; renderMain(); }
  else if (k === 'rep' && v) { quickAdd(v, { repeat: { freq: 'monthly', interval: 1 } }); renderMain(); setTimeout(() => { const i = $('#rep-new'); if (i) i.focus(); }, 20); }
});
let typeT;
document.addEventListener('input', e => {
  const el = e.target; const t = curTask();
  if (el.dataset && el.dataset.enter === 'qa') {
    ui.qa = el.value;
    const prev = document.getElementById(el.id + '-prev'); if (prev) prev.innerHTML = qaPreview(el.value);
    return;
  }
  if (el.classList.contains('title-in') && el.tagName === 'TEXTAREA') { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  if (t && el.id === 't-title') { t.title = el.value; t.updatedAt = now(); clearTimeout(typeT); typeT = setTimeout(save, 600); return; }
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
  const el = e.target; const t = curTask();
  if (t) {
    if (el.id === 't-due') { setDue(t, el.value || null); renderSheet(); renderMain(); return; }
    if (el.id === 't-time') { upd(t, { time: el.value || null }); renderMain(); return; }
    if (el.id === 't-repeat') {
      const f = el.value; upd(t, { repeat: f ? { freq: f, interval: 1, day: f === 'monthly' ? pd(t.due || today()).getDate() : undefined } : null, due: t.due || (f ? today() : null) });
      renderSheet(); renderMain(); return;
    }
    if (el.id === 't-project') { upd(t, { projectId: el.value || null, stageId: null }); renderSheet(); renderMain(); return; }
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
    if (el.id === 'proj-name' || el.dataset.stage) { save(); renderMain(); return; }
    if (el.dataset.stageDue) { upd(p, { stages: p.stages.map(s => s.id === el.dataset.stageDue ? { ...s, due: el.value || null } : s) }); return; }
  }
  if (el.id === 'r-from') { ui.rFrom = el.value; renderMain(); }
  if (el.id === 'r-to') { ui.rTo = el.value; renderMain(); }
});

/* ---------------- boot ---------------- */
window.addEventListener('online', () => { renderMain(); if (authed()) { sync(); refreshMonth(ui.month, true); } });
window.addEventListener('offline', () => renderMain());
let lastWake = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') { if (LS.get('dirty', false)) sync(); return; }
  if (now() - lastWake < 30e3) return; lastWake = now();
  const t = today(); if (ui.sel < t && ui.sel.slice(0, 7) === t.slice(0, 7)) ui.sel = t;
  renderMain();
  if (authed()) { sync(); refreshMonth(ui.month, true); }
});
setInterval(() => { if (document.visibilityState === 'visible' && authed()) { refreshMonth(ui.month, true); if (LS.get('dirty', false)) sync(); } }, 5 * 60e3);

/* launch links from home-screen shortcuts and the widget: ?v=view  ?a=add|event  ?t=taskId  ?d=YYYY-MM-DD */
function handleLaunch() {
  const q = new URLSearchParams(location.search);
  if (![...q.keys()].length) return;
  history.replaceState(null, '', location.pathname);
  if (!LS.get('signedIn', false)) return;
  const v = q.get('v'), a = q.get('a'), t = q.get('t'), d = q.get('d');
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) { ui.sel = d; ui.month = d.slice(0, 7); ui.view = 'home'; }
  if (v && ['home', 'tasks', 'repeat', 'projects', 'review'].includes(v)) { ui.view = v; ui.projectId = null; LS.set('view', v); }
  if (a === 'add') ui.view = ui.view === 'review' ? 'home' : ui.view;
  renderMain();
  if (t && db.tasks[t] && !db.tasks[t].deleted) openSheet({ type: 'task', id: t });
  else if (a === 'event') openEventSheet(null, { date: ui.sel });
  else if (a === 'add') setTimeout(() => { const i = window.innerWidth >= 900 ? $('#qa-d') : $('#qa-m'); if (i) i.focus(); }, 150);
}

renderMain(); renderSheet();
handleLaunch();
if (LS.get('signedIn', false)) { initAuth(); if (authed()) afterAuth(); }
else initAuth();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
