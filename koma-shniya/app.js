/* קומה שניה · project app (vanilla JS + Supabase) */
'use strict';

const SB_URL = 'https://ghnvkgufqtbwfmsaassx.supabase.co';
const SB_KEY = 'sb_publishable_bC4IdJRndDNrFVEogNu-6w_cIQurKtH';
const G_SCOPES = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/calendar.events';
const DRIVE = 'https://drive.google.com/drive/folders/';
const ROOT_FOLDER = '13B9_eKr4sBGD7RQrAM1baqtMvWwrSDiW';
const WISHLIST = 'https://docs.google.com/spreadsheets/d/1LskxffHc3tt9fNDcHVV7BCGTjGqnlFFSy-7fzl-Ff6M/edit';
const FOLDERS = [
  { key: 'plan', name: 'תכנון', id: '1C9BSw2dAPxAhhtkBCNpx5LyOXNsMczEY' },
  { key: 'receipts', name: 'קבלות', id: '1Dymu6dW2MovRZ8aWjO4lVn15AATNuhEM' },
  { key: 'approvals', name: 'אישורים', id: '1gxLwjfsOOp4nZ5iVEx2n7Me8nGlcPHYB' },
  { key: 'ideas', name: 'דוגמאות ורצונות שלנו', id: '1TdNxxJsejb6EtkrRGlfiKJuVG0PiBLZH' }
];
const DEFAULT_FOLDER = { task: 'plan', decision: 'approvals', cost: 'receipts', update: 'plan' };
const TABLE = { task: 'sf_tasks', decision: 'sf_decisions', cost: 'sf_costs', group: 'sf_groups', stage: 'sf_stages', update: 'sf_updates', extra: 'sf_extras', source: 'sf_sources' };

const BASE = location.origin + location.pathname.replace(/[^/]*$/, '');
const sb = supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } });

const S = {
  session: null, me: null, members: [], ready: false,
  tab: 'home', viewStage: null, manage: false,
  stages: [], tasks: [], decisions: [], costs: [], updates: [], groups: [], fin: {}, extras: [], sources: [],
  edit: null, d: {}, sheet: null, finOpen: { est: true, fund: false, paid: false },
  toast: null, undo: null, busy: false
};

/* ---------- helpers ---------- */
const $root = () => document.getElementById('root');
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { const n = Number(String(v == null ? '' : v).replace(/[^\d.\-]/g, '')); return isFinite(n) ? n : 0; };
const shekel = (n) => '₪' + Math.round(Number(n) || 0).toLocaleString('he-IL');
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const fmtDate = (d) => { const p = String(d || '').split('-'); return p.length === 3 ? Number(p[2]) + '.' + Number(p[1]) : ''; };
const nameOf = (email) => (S.members.find((m) => m.email === email) || {}).name || email || '';
const initial = (n) => (n || '?').trim().charAt(0);
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* ignore */ } };
const ago = (ts) => {
  if (!ts) return '';
  const d = new Date(ts); const days = Math.floor((new Date(today()) - new Date(d.toISOString().slice(0, 10))) / 864e5);
  if (days <= 0) return 'היום ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'אתמול';
  if (days < 7) return 'לפני ' + days + ' ימים';
  return d.getDate() + '.' + (d.getMonth() + 1);
};
const I = {
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
  right: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>',
  left: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>',
  down: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>',
  up: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>',
  trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>',
  pen: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  bell: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  cal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  clip: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  home: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  steps: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4v-5h4v-5h4V5h4"/></svg>',
  dec: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>',
  money: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>',
  links: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
};

/* ---------- Google token (Drive + Calendar) ---------- */
function saveGToken(tok) { lsSet('sf_gtoken', JSON.stringify({ tok: tok, exp: Date.now() + 50 * 60 * 1000 })); }
function gToken() {
  try { const o = JSON.parse(lsGet('sf_gtoken') || 'null'); return o && o.exp > Date.now() ? o.tok : null; } catch (e) { return null; }
}
function googleLogin() {
  return sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: BASE, scopes: G_SCOPES, queryParams: { prompt: 'select_account' } } });
}
function needGoogle(what) {
  toast('כדי ' + what + ' צריך לאשר גישה ל־Google', { label: 'אשר', fn: googleLogin });
}
async function gfetch(url, opts) {
  const tok = gToken();
  if (!tok) throw new Error('NO_TOKEN');
  const r = await fetch(url, { ...opts, headers: { ...(opts && opts.headers), Authorization: 'Bearer ' + tok } });
  if (r.status === 401) { lsSet('sf_gtoken', null); throw new Error('NO_TOKEN'); }
  if (!r.ok && r.status !== 204) throw new Error('Google ' + r.status + ': ' + (await r.text()).slice(0, 200));
  return r.status === 204 ? null : r.json();
}
async function driveUpload(file, folderKey) {
  const f = FOLDERS.find((x) => x.key === folderKey) || FOLDERS[0];
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({ name: file.name, parents: [f.id] })], { type: 'application/json' }));
  form.append('file', file);
  const res = await gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink', { method: 'POST', body: form });
  return { id: res.id, name: res.name, url: res.webViewLink, folder: f.name };
}
async function calSync(task) {
  const base = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  if (!task.cal || !task.due) {
    if (task.cal_event_id) { try { await gfetch(base + '/' + task.cal_event_id, { method: 'DELETE' }); } catch (e) { if (e.message === 'NO_TOKEN') throw e; } }
    return null;
  }
  const end = new Date(task.due + 'T00:00:00'); end.setDate(end.getDate() + 1);
  const endStr = end.getFullYear() + '-' + String(end.getMonth() + 1).padStart(2, '0') + '-' + String(end.getDate()).padStart(2, '0');
  const body = {
    summary: 'קומה שניה: ' + task.text,
    description: 'משימה מאפליקציית קומה שניה · אחראי: ' + nameOf(task.owner) + '\n' + BASE,
    start: { date: task.due }, end: { date: endStr },
    reminders: { useDefault: false, overrides: task.remind ? [{ method: 'popup', minutes: 15 * 60 }] : [] }
  };
  if (S.me && task.owner !== S.me.email) body.attendees = [{ email: task.owner }];
  const q = body.attendees ? '?sendUpdates=all' : '';
  if (task.cal_event_id) {
    try { const ev = await gfetch(base + '/' + task.cal_event_id + q, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return ev.id; }
    catch (e) { if (e.message === 'NO_TOKEN') throw e; }
  }
  const ev = await gfetch(base + q, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return ev.id;
}

/* ---------- data ---------- */
async function q(p) { const { data, error } = await p; if (error) throw error; return data; }
async function loadAll() {
  const [stages, tasks, decisions, costs, updates, groups, fin, extras, sources] = await Promise.all([
    q(sb.from('sf_stages').select('*').order('position')),
    q(sb.from('sf_tasks').select('*').order('position').order('created_at')),
    q(sb.from('sf_decisions').select('*').order('updated_at', { ascending: false })),
    q(sb.from('sf_costs').select('*').order('created_at', { ascending: false })),
    q(sb.from('sf_updates').select('*').order('created_at', { ascending: false }).limit(30)),
    q(sb.from('sf_groups').select('*').order('position').order('created_at')),
    q(sb.from('sf_finance').select('*').eq('id', 1).maybeSingle()),
    q(sb.from('sf_extras').select('*').order('position').order('created_at')),
    q(sb.from('sf_sources').select('*').order('position').order('created_at'))
  ]);
  Object.assign(S, { stages, tasks, decisions, costs, updates, groups, fin: fin || {}, extras, sources });
  if (!S.viewStage || !stages.find((s) => s.id === S.viewStage)) S.viewStage = (stages.find((s) => s.is_current) || stages[0] || {}).id;
}
async function run(fn, okMsg) {
  if (S.busy) return;
  S.busy = true;
  try { await fn(); await loadAll(); if (okMsg) toast(okMsg); }
  catch (e) {
    console.error(e);
    if (e && e.message === 'NO_TOKEN') needGoogle('להשתמש ב־Drive וביומן');
    else toast('משהו לא נשמר: ' + (e.message || e));
  } finally { S.busy = false; render(); }
}
const logUpdate = (kind, text, files) => q(sb.from('sf_updates').insert({ kind: kind, text: text, files: files || [] }));

/* ---------- computed ---------- */
const curStage = () => S.stages.find((s) => s.is_current) || S.stages[0];
const tasksOf = (sid) => S.tasks.filter((t) => t.stage_id === sid);
function stat(st) {
  const ts = st ? tasksOf(st.id) : [];
  const d = ts.filter((t) => t.done).length; const open = ts.find((t) => !t.done);
  return { done: d, count: ts.length, pct: ts.length ? Math.round((d / ts.length) * 100) : 0, next: open ? open.text : '' };
}
function finCalc() {
  const f = S.fin; const area = num(f.area); const pct = num(f.pct);
  const extras = S.extras.reduce((a, x) => a + num(x.amount), 0);
  const est = (pm) => (area * num(pm) + extras) * (1 + pct / 100);
  const minE = est(f.pm_min); const maxE = est(f.pm_max);
  const monthly = (s) => {
    if (s.kind !== 'loan') return 0;
    const amt = num(s.amount); const months = num(s.years) * 12; const r = num(s.rate) / 100 / 12;
    if (!amt || !months) return 0;
    return r ? (amt * r) / (1 - Math.pow(1 + r, -months)) : amt / months;
  };
  const fundTotal = S.sources.reduce((a, s) => a + num(s.amount), 0);
  const monthlyTotal = S.sources.reduce((a, s) => a + monthly(s), 0);
  const paid = S.costs.reduce((a, c) => a + num(c.amount), 0);
  return { extras, minE, maxE, hasEst: area > 0 && (num(f.pm_min) > 0 || num(f.pm_max) > 0), monthly, fundTotal, monthlyTotal, gap: maxE - fundTotal, paid };
}

/* ---------- toast / undo ---------- */
let toastTimer = null;
function toast(text, action) {
  S.toast = { text: text, action: action || null };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { S.toast = null; S.undo = null; render(); }, action ? 7000 : 3500);
  render();
}
async function removeWithUndo(kind, id, label) {
  const table = TABLE[kind];
  const row = (kind === 'stage' ? S.stages : kind === 'task' ? S.tasks : kind === 'decision' ? S.decisions : kind === 'cost' ? S.costs : kind === 'group' ? S.groups : kind === 'extra' ? S.extras : S.sources).find((x) => x.id === id);
  if (!row) return;
  const children = kind === 'stage' ? tasksOf(id) : [];
  await run(async () => { await q(sb.from(table).delete().eq('id', id)); });
  S.edit = null;
  S.undo = { table: table, row: row, children: children };
  toast(label + ' נמחק', { label: 'בטל', fn: undoDelete });
}
async function undoDelete() {
  const u = S.undo; if (!u) return;
  S.undo = null; S.toast = null;
  await run(async () => {
    await q(sb.from(u.table).insert(u.row));
    if (u.children.length) await q(sb.from('sf_tasks').insert(u.children));
  }, 'שוחזר');
}

/* ---------- render ---------- */
function render() {
  const root = $root();
  if (!S.ready) return;
  if (!S.session) { root.innerHTML = loginView(); return; }
  if (!S.me) { root.innerHTML = noAccessView(); return; }
  const scrollY = window.scrollY;
  root.innerHTML = headerView() + '<main>' + ({ home: homeView, stages: S.manage ? manageView : stagesView, decisions: decisionsView, finance: financeView, links: linksView }[S.tab])() + '</main>' + navView() + sheetView() + toastView();
  window.scrollTo(0, scrollY);
}

function loginView() {
  return `<div class="login">
    <h1 style="margin:0;font-size:32px;font-weight:700">קומה שניה</h1>
    <p style="margin:0;font-size:16px;color:var(--muted);line-height:1.5">ניהול הפרויקט של שים ועטרת. נכנסים עם חשבון Google.</p>
    <button class="gbtn" data-a="google"><svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>כניסה עם Google</button>
    <details style="font-size:14px;color:var(--muted)"><summary style="min-height:44px;display:flex;align-items:center;cursor:pointer">כניסה עם קישור במייל</summary>
      <form data-form="magic" style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
        <input type="email" name="email" dir="ltr" placeholder="name@gmail.com" required autocomplete="email">
        <button class="btn" type="submit">שלחו לי קישור</button>
        <span class="small">בכניסה במייל אי אפשר להעלות ל־Drive או להוסיף ליומן.</span>
      </form></details>
  </div>`;
}
function noAccessView() {
  return `<div class="login"><h1 style="margin:0;font-size:26px">אין הרשאה</h1>
    <p style="margin:0;color:var(--muted);line-height:1.5">החשבון ${esc(S.session.user.email)} לא ברשימת המשתמשים של קומה שניה.</p>
    <button class="btn wide" data-a="logout">התחברות עם חשבון אחר</button></div>`;
}
function headerView() {
  return `<header class="top"><h1>קומה שניה</h1>
    <button class="me" data-a="sheet" data-v="me" aria-label="החשבון שלי"><span class="avatar">${esc(initial(S.me.name))}</span><span style="font-size:15px;font-weight:500">${esc(S.me.name)}</span>${I.down}</button></header>`;
}
function navView() {
  const t = (k, label, ic) => `<button data-a="tab" data-v="${k}" class="${S.tab === k ? 'on' : ''}" aria-current="${S.tab === k ? 'page' : 'false'}">${ic}${label}</button>`;
  return `<nav class="tabs">${t('home', 'בית', I.home)}${t('stages', 'שלבים', I.steps)}${t('decisions', 'החלטות', I.dec)}${t('finance', 'כספים', I.money)}${t('links', 'קישורים', I.links)}</nav>
    ${S.tab === 'home' || S.tab === 'decisions' ? `<button class="fab" data-a="sheet" data-v="add">${I.plus}הוספה</button>` : ''}`;
}
function toastView() {
  if (!S.toast) return '';
  return `<div class="toast" role="status"><span style="flex:1">${esc(S.toast.text)}</span>${S.toast.action ? `<button data-a="toastAct">${esc(S.toast.action.label)}</button>` : ''}</div>`;
}
const filesView = (files) => (files && files.length ? `<div class="files">${files.map((f) => `<a class="file" href="${esc(f.url)}" target="_blank" rel="noopener">${I.clip}<span>${esc(f.name)}</span></a>`).join('')}</div>` : '');
function attachRow(kind, id) {
  const sel = S.d.folder || DEFAULT_FOLDER[kind];
  return `<div class="grid2"><label class="f">תיקייה ב־Drive<select data-f="folder">${FOLDERS.map((f) => `<option value="${f.key}" ${f.key === sel ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select></label>
    <label class="btn ghost" style="display:flex;align-items:center;justify-content:center;gap:6px;min-height:44px;font-size:14px">${I.clip}צרף קובץ<input type="file" hidden data-upload="${kind}" data-id="${id}"></label></div>`;
}

/* --- home --- */
function homeView() {
  const st = curStage(); const s = stat(st); const idx = S.stages.indexOf(st);
  const mine = S.tasks.filter((t) => !t.done && t.owner === S.me.email).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
  return `${pushHint()}
  <section class="card"><span class="lbl">השלב הנוכחי · ${idx + 1} מתוך ${S.stages.length}</span>
    <span style="font-size:24px;font-weight:600">${esc(st ? st.name : '')}</span>
    <div style="display:flex;flex-direction:column;gap:6px"><div class="bar"><div style="width:${s.pct}%"></div></div><span class="small">${s.done} מתוך ${s.count} משימות הושלמו</span></div>
    ${s.next ? `<div class="next"><span style="font-size:12px;font-weight:500">הצעד הבא</span><span style="font-size:16px;font-weight:600;line-height:1.35">${esc(s.next)}</span></div>` : ''}
    <button class="btn wide" data-a="openCurrent">למשימות השלב</button></section>
  <h2>המשימות שלי</h2>
  ${mine.length ? `<div class="box tasks" style="padding:4px 8px">${mine.map((t) => taskRow(t, true)).join('')}</div>` : '<p class="empty" style="text-align:right;padding:0">אין משימות פתוחות עליך כרגע</p>'}
  <h2>עדכונים אחרונים</h2>
  ${S.updates.length ? S.updates.slice(0, 15).map((u) => `<article class="box" style="padding:12px 14px;display:flex;flex-direction:column;gap:4px">
     <div class="between small"><span><b style="color:var(--ink);font-weight:600">${esc(u.created_by)}</b> · ${esc(u.kind)}</span><span>${esc(ago(u.created_at))}</span></div>
     <p style="margin:0;font-size:15px;line-height:1.45">${esc(u.text)}</p>${filesView(u.files)}</article>`).join('') : '<p class="empty">אין עדכונים עדיין</p>'}`;
}
function pushHint() {
  if (lsGet('sf_push_hint') === 'off') return '';
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (supported && Notification.permission === 'granted' && lsGet('sf_push_on') === '1') return '';
  let body;
  if (isIOS() && !standalone()) body = 'כדי לקבל תזכורות באייפון: לחצו על כפתור השיתוף בספארי, בחרו "הוסף למסך הבית", ופתחו את האפליקציה מהאייקון החדש. שם יופיע כפתור להפעלת התראות.';
  else if (!supported) body = 'הדפדפן הזה לא תומך בהתראות. נסו לפתוח ב־Chrome (אנדרואיד) או מהאייקון במסך הבית (אייפון).';
  else body = 'הפעילו התראות כדי לקבל תזכורת יום לפני תאריך היעד של משימה.';
  return `<div class="hint"><b style="font-size:15px">תזכורות בטלפון</b><span>${body}</span>
    <div class="actions">${supported && !(isIOS() && !standalone()) ? `<button class="btn sm" data-a="enablePush">${I.bell} הפעל התראות</button>` : ''}<button class="btn link sm push" data-a="hidePushHint">לא עכשיו</button></div></div>`;
}

/* --- tasks --- */
function taskMeta(t, withStage) {
  const late = t.due && !t.done && t.due < today();
  const parts = [];
  if (withStage) { const st = S.stages.find((s) => s.id === t.stage_id); if (st) parts.push(st.name); }
  else parts.push(nameOf(t.owner));
  if (t.due) parts.push((late ? 'באיחור · ' : 'עד ') + fmtDate(t.due));
  if (t.due && t.remind) parts.push('תזכורת');
  if (t.due && t.cal) parts.push('ביומן');
  if (t.files && t.files.length) parts.push(t.files.length + ' קבצים');
  return `<span class="small ${late ? 'late' : ''}">${esc(parts.join(' · '))}</span>`;
}
function taskRow(t, withStage) {
  return `<div class="task"><button class="check ${t.done ? 'on' : ''}" data-a="toggleTask" data-id="${t.id}" aria-pressed="${t.done}" aria-label="סמן כבוצע"><span>${t.done ? I.check : ''}</span></button>
    <button class="tbody" data-a="edit" data-k="task" data-id="${t.id}" aria-label="ערוך משימה: ${esc(t.text)}"><b class="${t.done ? 'done' : ''}">${esc(t.text)}</b>${taskMeta(t, withStage)}</button></div>`;
}
function taskEditor(t) {
  const d = S.d;
  return `<div class="editor">
    <input data-f="text" value="${esc(d.text)}" aria-label="שם המשימה">
    <div class="row" style="flex-wrap:wrap"><span class="small">אחראי:</span>${S.members.map((m) => `<button class="chip ${d.owner === m.email ? 'on' : ''}" data-a="draft" data-f="owner" data-v="${esc(m.email)}" aria-pressed="${d.owner === m.email}">${esc(m.name)}</button>`).join('')}</div>
    <div class="grid2"><label class="f">תאריך יעד<input type="date" data-f="due" value="${esc(d.due || '')}"></label>
      <button class="toggle ${d.remind ? 'on' : ''}" data-a="draftToggle" data-f="remind" aria-pressed="${!!d.remind}">${I.bell}תזכורת יום לפני</button></div>
    <button class="toggle ${d.cal ? 'on' : ''}" data-a="draftToggle" data-f="cal" aria-pressed="${!!d.cal}">${I.cal}${d.cal ? 'ביומן Google של ' + esc(nameOf(d.owner)) : 'להוסיף ליומן Google?'}</button>
    ${d.cal && !d.due ? '<span class="small late">כדי להוסיף ליומן צריך תאריך יעד</span>' : ''}
    ${filesView(t.files)}${attachRow('task', t.id)}
    <div class="actions"><button class="btn sm" data-a="saveTask" data-id="${t.id}">שמור</button><button class="btn link sm" data-a="cancel">ביטול</button>
      <button class="btn danger sm push" data-a="remove" data-k="task" data-id="${t.id}">מחק</button></div></div>`;
}
function stagesView() {
  const idx = Math.max(0, S.stages.findIndex((s) => s.id === S.viewStage));
  const st = S.stages[idx]; const cur = curStage(); const curIdx = S.stages.indexOf(cur);
  if (!st) return '<p class="empty">אין שלבים. לחצו "ערוך שלבים" כדי להוסיף.</p>' + manageBtn();
  const label = idx < curIdx ? ['הושלם', 'var(--acc-dark)'] : idx === curIdx ? ['נוכחי', 'var(--acc)'] : ['בהמשך', 'var(--muted)'];
  const ts = tasksOf(st.id);
  return `<div class="between"><h2 class="big">שלבים ומשימות</h2>${manageBtn()}</div>
  <div class="stagenav"><button class="arrow" data-a="stageStep" data-v="-1" aria-label="השלב הקודם" ${idx === 0 ? 'disabled' : ''}>${I.right}</button>
    <button class="stagebtn" data-a="sheet" data-v="picker"><span class="lbl" style="font-size:12px">שלב ${idx + 1} מתוך ${S.stages.length} · <span style="color:${label[1]}">${label[0]}</span></span><span style="font-size:18px;font-weight:600">${esc(st.name)}</span></button>
    <button class="arrow" data-a="stageStep" data-v="1" aria-label="השלב הבא" ${idx === S.stages.length - 1 ? 'disabled' : ''}>${I.left}</button></div>
  ${st.id !== cur.id ? `<div class="warn"><span style="flex:1">השלב הנוכחי הוא ${esc(cur.name)}</span><button class="btn sm" data-a="sheet" data-v="reason">הגדר כנוכחי</button></div>` : ''}
  <p class="small" style="margin:0">לחיצה על משימה פותחת עריכה. הריבוע מסמן שבוצעה.</p>
  ${ts.map((t) => `<div class="box" style="padding:2px 10px 2px 4px">${S.edit && S.edit.kind === 'task' && S.edit.id === t.id ? taskEditor(t) : taskRow(t, false)}</div>`).join('') || '<p class="empty">אין עדיין משימות בשלב הזה</p>'}
  <form data-form="addTask" class="row"><input name="text" placeholder="משימה חדשה לשלב הזה" aria-label="משימה חדשה" style="flex:1;min-height:48px;border-radius:12px;border-color:#D8D2C6" required><button class="btn" type="submit" style="min-height:48px">הוסף</button></form>`;
}
const manageBtn = () => `<button class="btn ghost sm" data-a="manage" style="display:flex;align-items:center;gap:6px">${I.pen} ערוך שלבים</button>`;
function manageView() {
  return `<div class="between"><h2 class="big">עריכת שלבים</h2><button class="btn sm" data-a="manageDone">סיום</button></div>
  <p class="small" style="margin:0">שינוי שם נשמר כשיוצאים מהשדה. אי אפשר למחוק את השלב הנוכחי.</p>
  <div class="box list">${S.stages.map((s, i) => `<div class="mgr">
    <input data-save="stage" data-id="${s.id}" data-col="name" value="${esc(s.name)}" aria-label="שם השלב">
    <button class="ic" data-a="moveStage" data-id="${s.id}" data-v="-1" aria-label="הזז למעלה" ${i === 0 ? 'disabled' : ''}>${I.up}</button>
    <button class="ic" data-a="moveStage" data-id="${s.id}" data-v="1" aria-label="הזז למטה" ${i === S.stages.length - 1 ? 'disabled' : ''}>${I.down}</button>
    <button class="ic del" data-a="remove" data-k="stage" data-id="${s.id}" aria-label="מחק שלב" ${s.is_current ? 'disabled' : ''}>${I.trash}</button></div>`).join('')}</div>
  <form data-form="addStage" class="row"><input name="name" placeholder="שלב חדש" aria-label="שלב חדש" style="flex:1;min-height:48px;border-radius:12px" required><button class="btn" type="submit" style="min-height:48px">הוסף</button></form>`;
}

/* --- decisions --- */
function decisionsView() {
  const open = S.decisions.filter((x) => x.status === 'פתוח'); const closed = S.decisions.filter((x) => x.status !== 'פתוח');
  const card = (x) => {
    if (S.edit && S.edit.kind === 'decision' && S.edit.id === x.id) {
      return `<div class="box editor"><input data-f="title" value="${esc(S.d.title)}" aria-label="כותרת">
        <textarea data-f="note" aria-label="פירוט">${esc(S.d.note)}</textarea>
        <div class="grid2">${['פתוח', 'סגור'].map((v) => `<button class="toggle ${S.d.status === v ? 'on' : ''}" data-a="draft" data-f="status" data-v="${v}">${v === 'פתוח' ? 'עוד פתוח' : 'הוחלט'}</button>`).join('')}</div>
        ${filesView(x.files)}${attachRow('decision', x.id)}
        <div class="actions"><button class="btn sm" data-a="saveDecision" data-id="${x.id}">שמור</button><button class="btn link sm" data-a="cancel">ביטול</button>
        <button class="btn danger sm push" data-a="remove" data-k="decision" data-id="${x.id}">מחק</button></div></div>`;
    }
    return `<button class="box" data-a="edit" data-k="decision" data-id="${x.id}" style="padding:14px;display:flex;flex-direction:column;gap:6px;text-align:right;width:100%">
      <span class="between" style="width:100%"><b style="font-size:16px;font-weight:600">${esc(x.title)}</b><span class="pill ${x.status === 'פתוח' ? 'open' : ''}">${x.status === 'פתוח' ? 'פתוח' : 'הוחלט'}</span></span>
      ${x.note ? `<span style="font-size:15px;line-height:1.45">${esc(x.note)}</span>` : ''}
      <span class="small">${esc(ago(x.updated_at))} · ${esc(x.updated_by)}${x.files && x.files.length ? ' · ' + x.files.length + ' קבצים' : ''}</span></button>`;
  };
  return `<h2 class="big">החלטות</h2><p class="small" style="margin:0">לחיצה על החלטה פותחת עריכה. הוספה דרך כפתור "הוספה".</p>
  ${open.length ? '<h2>פתוחות</h2>' + open.map(card).join('') : ''}${closed.length ? '<h2>הוחלטו</h2>' + closed.map(card).join('') : ''}
  ${S.decisions.length ? '' : '<p class="empty">אין החלטות עדיין</p>'}`;
}

/* --- finance --- */
function financeView() {
  const c = finCalc(); const f = S.fin;
  const acc = (key, title, sum, body) => `<section class="card" style="padding:4px 16px ${S.finOpen[key] ? '16px' : '4px'}">
    <button class="acc-h" data-a="finToggle" data-v="${key}" aria-expanded="${S.finOpen[key]}"><span style="display:flex;flex-direction:column;gap:2px"><b>${title}</b><span class="small" data-out="${key}Sum">${sum}</span></span>${S.finOpen[key] ? I.up : I.down}</button>
    ${S.finOpen[key] ? body : ''}</section>`;
  const fin = (col, label, ph) => `<label class="f">${label}<input inputmode="decimal" data-fin="${col}" value="${esc(f[col] == null ? '' : f[col])}" placeholder="${ph || ''}"></label>`;
  const estSum = c.hasEst ? shekel(c.minE) + ' – ' + shekel(c.maxE) : 'עוד לא הוזנו נתונים';
  const est = `<div class="grid3">${fin('area', 'שטח במ״ר')}${fin('pm_min', 'מינימום למ״ר')}${fin('pm_max', 'מקסימום למ״ר')}</div>
    <h2 style="font-size:15px">תוספות</h2>
    <div class="box list">${S.extras.map((x) => `<div class="mgr"><input data-save="extra" data-id="${x.id}" data-col="name" value="${esc(x.name)}" aria-label="שם התוספת">
      <input inputmode="decimal" data-save="extra" data-id="${x.id}" data-col="amount" value="${esc(x.amount == null ? '' : x.amount)}" placeholder="₪" aria-label="סכום" style="flex:0 0 34%">
      <button class="ic del" data-a="remove" data-k="extra" data-id="${x.id}" aria-label="מחק תוספת">${I.trash}</button></div>`).join('')}</div>
    <form data-form="addExtra" class="row"><input name="name" placeholder="תוספת חדשה" aria-label="תוספת חדשה" style="flex:1" required><button class="btn sm" type="submit" style="min-height:44px">הוסף</button></form>
    <div class="grid2">${fin('pct', 'בלתי צפוי (%)', '10')}<span></span></div>
    <div class="next"><span style="font-size:12px;font-weight:500">הערכה כוללת</span><span class="big-num" data-out="estBig">${c.hasEst ? shekel(c.minE) + ' עד ' + shekel(c.maxE) : '—'}</span>
    <span class="small" style="color:#1F3328">(שטח × מחיר למ״ר + תוספות) + בלתי צפוי. את המחיר למ״ר כדאי לקבל מהאדריכלים.</span></div>`;
  const fund = `<div style="display:flex;flex-direction:column;gap:10px">${S.sources.map((s) => `<div class="box" style="padding:12px;display:flex;flex-direction:column;gap:8px">
      <div class="row"><input data-save="source" data-id="${s.id}" data-col="name" value="${esc(s.name)}" aria-label="שם המקור" style="flex:1"><button class="ic del" data-a="remove" data-k="source" data-id="${s.id}" aria-label="מחק מקור">${I.trash}</button></div>
      <div class="grid2">${[['equity', 'הון עצמי'], ['loan', 'הלוואה']].map((k) => `<button class="toggle ${s.kind === k[0] ? 'on' : ''}" data-a="sourceKind" data-id="${s.id}" data-v="${k[0]}">${k[1]}</button>`).join('')}</div>
      ${s.kind === 'loan' ? `<div class="grid3"><label class="f">סכום<input inputmode="decimal" data-save="source" data-id="${s.id}" data-col="amount" value="${esc(s.amount == null ? '' : s.amount)}" placeholder="₪"></label>
        <label class="f">ריבית (%)<input inputmode="decimal" data-save="source" data-id="${s.id}" data-col="rate" value="${esc(s.rate == null ? '' : s.rate)}"></label>
        <label class="f">שנים<input inputmode="decimal" data-save="source" data-id="${s.id}" data-col="years" value="${esc(s.years == null ? '' : s.years)}"></label></div>
        <span class="small" data-out="monthly-${s.id}">החזר חודשי: ${shekel(c.monthly(s))}</span>`
      : `<label class="f">סכום<input inputmode="decimal" data-save="source" data-id="${s.id}" data-col="amount" value="${esc(s.amount == null ? '' : s.amount)}" placeholder="₪"></label>`}</div>`).join('')}</div>
    <form data-form="addSource" class="row"><input name="name" placeholder="מקור מימון חדש (למשל הלוואה מהקרן)" aria-label="מקור מימון חדש" style="flex:1" required><button class="btn sm" type="submit" style="min-height:44px">הוסף</button></form>
    <div class="box" style="padding:10px 14px"><div class="sum"><span>סך המימון</span><b data-out="fundTotal">${shekel(c.fundTotal)}</b></div>
      <div class="sum"><span>החזרים חודשיים</span><b data-out="monthlyTotal">${shekel(c.monthlyTotal)}</b></div>
      <div class="sum"><span>פער מול ההערכה המקסימלית</span><b data-out="gap" class="${c.gap > 0 ? 'late' : ''}">${c.hasEst ? shekel(c.gap) : '—'}</b></div></div>`;
  const costRow = (x) => {
    if (S.edit && S.edit.kind === 'cost' && S.edit.id === x.id) {
      return `<div class="editor"><input data-f="what" value="${esc(S.d.what)}" aria-label="על מה">
        <div class="grid2"><label class="f">סכום<input inputmode="decimal" data-f="amount" value="${esc(S.d.amount)}"></label><label class="f">תאריך<input type="date" data-f="paid_on" value="${esc(S.d.paid_on || '')}"></label></div>
        ${filesView(x.files)}${attachRow('cost', x.id)}
        <div class="actions"><button class="btn sm" data-a="saveCost" data-id="${x.id}">שמור</button><button class="btn link sm" data-a="cancel">ביטול</button>
        <button class="btn danger sm push" data-a="remove" data-k="cost" data-id="${x.id}">מחק</button></div></div>`;
    }
    return `<button class="tbody" data-a="edit" data-k="cost" data-id="${x.id}" style="flex-direction:row;align-items:center;justify-content:space-between;padding:8px 10px;width:100%">
      <span style="display:flex;flex-direction:column;gap:2px;min-width:0"><b>${esc(x.what)}</b><span class="small">${esc(x.paid_on ? fmtDate(x.paid_on) : ago(x.created_at))} · ${esc(x.created_by)}${x.files && x.files.length ? ' · קבלה' : ''}</span></span>
      <b style="font-weight:600;white-space:nowrap">${shekel(x.amount)}</b></button>`;
  };
  const paid = `${S.costs.length ? `<div class="box list">${S.costs.map(costRow).join('')}</div>` : '<p class="empty">עוד לא נרשמו תשלומים</p>'}
    <form data-form="addCost" class="grid2" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) auto"><input name="what" placeholder="על מה שילמנו" aria-label="על מה שילמנו" required><input name="amount" inputmode="decimal" placeholder="₪" aria-label="סכום" required><button class="btn sm" type="submit" style="min-height:44px">הוסף</button></form>`;
  return `<h2 class="big">כספים</h2>
  ${acc('est', 'הערכת עלות', estSum, est)}
  ${acc('fund', 'מימון', shekel(c.fundTotal) + ' · החזר חודשי ' + shekel(c.monthlyTotal), fund)}
  ${acc('paid', 'שולם עד עכשיו', shekel(c.paid), paid)}`;
}
function refreshFinOut() {
  const c = finCalc();
  const set = (k, v) => { const el = document.querySelector('[data-out="' + k + '"]'); if (el) el.textContent = v; };
  set('estSum', c.hasEst ? shekel(c.minE) + ' – ' + shekel(c.maxE) : 'עוד לא הוזנו נתונים');
  set('estBig', c.hasEst ? shekel(c.minE) + ' עד ' + shekel(c.maxE) : '—');
  set('fundSum', shekel(c.fundTotal) + ' · החזר חודשי ' + shekel(c.monthlyTotal));
  set('fundTotal', shekel(c.fundTotal)); set('monthlyTotal', shekel(c.monthlyTotal)); set('gap', c.hasEst ? shekel(c.gap) : '—');
  S.sources.forEach((s) => set('monthly-' + s.id, 'החזר חודשי: ' + shekel(c.monthly(s))));
}

/* --- links --- */
function linksView() {
  const grp = (g) => {
    if (S.edit && S.edit.kind === 'group' && S.edit.id === g.id) {
      return `<div class="editor"><label class="f">שם הקבוצה<input data-f="name" value="${esc(S.d.name)}"></label>
        <label class="f">קישור הזמנה<input data-f="url" dir="ltr" inputmode="url" value="${esc(S.d.url)}" placeholder="https://chat.whatsapp.com/..."></label>
        <div class="actions"><button class="btn sm" data-a="saveGroup" data-id="${g.id}">שמור</button><button class="btn link sm" data-a="cancel">ביטול</button>
        <button class="btn danger sm push" data-a="remove" data-k="group" data-id="${g.id}">מחק</button></div></div>`;
    }
    return `<div class="mgr"><span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><b style="font-size:15px;font-weight:500">${esc(g.name)}</b><span class="small">${g.url ? 'קבוצת וואטסאפ' : 'עוד אין קישור'}</span></span>
      ${g.url ? `<a class="btn sm" href="${esc(g.url)}" target="_blank" rel="noopener" style="display:flex;align-items:center;text-decoration:none">פתח</a>` : ''}
      <button class="ic" data-a="edit" data-k="group" data-id="${g.id}" aria-label="ערוך ${esc(g.name)}">${I.pen}</button></div>`;
  };
  const link = (href, title, sub) => `<a class="mgr" href="${href}" target="_blank" rel="noopener" style="text-decoration:none;color:var(--ink)"><span style="flex:1;display:flex;flex-direction:column;gap:2px"><b style="font-size:15px;font-weight:500">${esc(title)}</b><span class="small">${esc(sub)}</span></span>${I.left}</a>`;
  return `<h2 class="big">קישורים</h2>
  <h2>קבוצות וואטסאפ</h2><div class="box list">${S.groups.map(grp).join('') || '<p class="empty">אין קבוצות</p>'}</div>
  <form data-form="addGroup" class="row"><input name="name" placeholder="קבוצה חדשה (למשל יועץ קרקע)" aria-label="קבוצה חדשה" style="flex:1" required><button class="btn sm" type="submit" style="min-height:44px">הוסף</button></form>
  <h2>Google Drive</h2><div class="box list">${link(DRIVE + ROOT_FOLDER, 'קומה שניה', 'התיקייה הראשית')}${FOLDERS.map((f) => link(DRIVE + f.id, f.name, 'תיקייה')).join('')}${link(WISHLIST, 'רשימת הרצונות', 'גיליון')}</div>`;
}

/* --- sheets --- */
function sheetView() {
  if (!S.sheet) return '';
  let body = '';
  if (S.sheet === 'picker') {
    const curIdx = S.stages.indexOf(curStage());
    body = `<h2 class="big">בחירת שלב</h2>${S.stages.map((s, i) => `<button class="opt ${s.id === S.viewStage ? 'on' : ''}" data-a="pickStage" data-id="${s.id}"><span>${i + 1}. ${esc(s.name)}</span><span class="small">${i < curIdx ? 'הושלם' : i === curIdx ? 'נוכחי' : stat(s).count + ' משימות'}</span></button>`).join('')}`;
  } else if (S.sheet === 'reason') {
    const st = S.stages.find((s) => s.id === S.viewStage); const back = S.stages.indexOf(st) < S.stages.indexOf(curStage());
    body = `<h2 class="big">${back ? 'חוזרים' : 'עוברים'} לשלב ${esc(st ? st.name : '')}</h2>
      <p class="small" style="margin:0">הסיבה תישמר כהחלטה ותופיע בעדכונים.</p>
      <textarea data-f="reason" placeholder="${back ? 'למה חוזרים אחורה?' : 'מה סגרנו בשלב הקודם?'}" aria-label="סיבה">${esc(S.d.reason || '')}</textarea>
      <button class="btn wide" data-a="setCurrent">הגדר כשלב הנוכחי</button><button class="btn link" data-a="closeSheet">ביטול</button>`;
  } else if (S.sheet === 'add') {
    const type = S.d.type || 'עדכון';
    body = `<h2 class="big">הוספה</h2>
      <div class="grid3">${['עדכון', 'החלטה', 'הוצאה'].map((t) => `<button class="toggle ${type === t ? 'on' : ''}" data-a="draft" data-f="type" data-v="${t}">${t}</button>`).join('')}</div>
      <textarea data-f="text" placeholder="${type === 'הוצאה' ? 'על מה שילמנו?' : type === 'החלטה' ? 'מה צריך להחליט או מה הוחלט?' : 'מה חדש? (פגישה, שיחה, מסקנה)'}" aria-label="תוכן">${esc(S.d.text || '')}</textarea>
      ${type === 'הוצאה' ? `<label class="f">סכום<input inputmode="decimal" data-f="amount" value="${esc(S.d.amount || '')}" placeholder="₪"></label>` : ''}
      ${type === 'החלטה' ? `<div class="grid2">${['פתוח', 'סגור'].map((v) => `<button class="toggle ${(S.d.status || 'פתוח') === v ? 'on' : ''}" data-a="draft" data-f="status" data-v="${v}">${v === 'פתוח' ? 'עוד פתוח' : 'הוחלט'}</button>`).join('')}</div>` : ''}
      <div class="grid2"><label class="f">תיקייה ב־Drive<select data-f="folder">${FOLDERS.map((f) => `<option value="${f.key}" ${f.key === (S.d.folder || DEFAULT_FOLDER[type === 'הוצאה' ? 'cost' : type === 'החלטה' ? 'decision' : 'update']) ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select></label>
        <label class="btn ghost" style="display:flex;align-items:center;justify-content:center;gap:6px;min-height:44px;font-size:14px">${I.clip}${S.pendingFile ? esc(S.pendingFile.name.slice(0, 18)) : 'צרף קובץ'}<input type="file" hidden data-pick="1"></label></div>
      <button class="btn wide" data-a="saveAdd">שמור</button>`;
  } else if (S.sheet === 'me') {
    const g = !!gToken(); const viaGoogle = (S.session.user.app_metadata.providers || []).includes('google');
    body = `<div class="row"><span class="avatar" style="width:44px;height:44px;border-radius:22px;font-size:18px">${esc(initial(S.me.name))}</span>
        <span style="display:flex;flex-direction:column;gap:2px"><b style="font-size:17px">${esc(S.me.name)}</b><span class="small" dir="ltr" style="text-align:right">${esc(S.me.email)}</span></span></div>
      <div class="box" style="padding:10px 14px;display:flex;flex-direction:column;gap:6px">
        <div class="sum"><span>Drive ויומן</span><b>${g ? 'מחובר' : viaGoogle ? 'צריך לאשר שוב' : 'לא מחובר'}</b></div>
        <div class="sum"><span>התראות</span><b>${'Notification' in window && Notification.permission === 'granted' && lsGet('sf_push_on') === '1' ? 'פעילות' : 'כבויות'}</b></div></div>
      ${g ? '' : '<button class="btn wide" data-a="google">חיבור Drive ויומן</button>'}
      ${'Notification' in window && 'PushManager' in window ? '<button class="btn ghost wide" data-a="enablePush">הפעלת התראות במכשיר הזה</button>' : ''}
      <button class="btn link" data-a="logout">התנתקות</button>`;
  }
  return `<div class="scrim" data-a="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${body}</div></div>`;
}

/* ---------- actions ---------- */
function startEdit(kind, id) {
  const list = { task: S.tasks, decision: S.decisions, cost: S.costs, group: S.groups }[kind];
  const x = list.find((r) => r.id === id); if (!x) return;
  S.edit = { kind: kind, id: id };
  S.d = kind === 'task' ? { text: x.text, owner: x.owner, due: x.due || '', remind: x.remind, cal: x.cal }
    : kind === 'decision' ? { title: x.title, note: x.note || '', status: x.status }
      : kind === 'cost' ? { what: x.what, amount: x.amount, paid_on: x.paid_on || '' }
        : { name: x.name, url: x.url || '' };
  render();
}
const A = {
  google: () => googleLogin(),
  logout: async () => { lsSet('sf_gtoken', null); await sb.auth.signOut(); S.me = null; S.sheet = null; render(); },
  tab: (el) => { S.tab = el.dataset.v; S.edit = null; S.manage = false; window.scrollTo(0, 0); render(); },
  sheet: (el) => { S.sheet = el.dataset.v; if (el.dataset.v === 'add' || el.dataset.v === 'reason') { S.d = {}; S.pendingFile = null; } render(); },
  closeSheet: () => { S.sheet = null; render(); },
  scrim: (el, ev) => { if (ev.target === el) { S.sheet = null; render(); } },
  toastAct: () => { const a = S.toast && S.toast.action; S.toast = null; render(); if (a) a.fn(); },
  openCurrent: () => { S.tab = 'stages'; S.viewStage = curStage().id; render(); },
  stageStep: (el) => { const i = S.stages.findIndex((s) => s.id === S.viewStage) + Number(el.dataset.v); if (S.stages[i]) { S.viewStage = S.stages[i].id; S.edit = null; render(); } },
  pickStage: (el) => { S.viewStage = el.dataset.id; S.sheet = null; S.edit = null; render(); },
  manage: () => { S.manage = true; render(); },
  manageDone: () => { S.manage = false; render(); },
  edit: (el) => startEdit(el.dataset.k, el.dataset.id),
  cancel: () => { S.edit = null; render(); },
  draft: (el) => { S.d[el.dataset.f] = el.dataset.v; render(); },
  draftToggle: (el) => { S.d[el.dataset.f] = !S.d[el.dataset.f]; render(); },
  finToggle: (el) => { S.finOpen[el.dataset.v] = !S.finOpen[el.dataset.v]; render(); },
  hidePushHint: () => { lsSet('sf_push_hint', 'off'); render(); },
  remove: (el) => {
    const k = el.dataset.k; const labels = { task: 'המשימה', decision: 'ההחלטה', cost: 'התשלום', group: 'הקבוצה', stage: 'השלב', extra: 'הפריט', source: 'מקור המימון' };
    removeWithUndo(k, el.dataset.id, labels[k]);
  },
  toggleTask: (el) => {
    const t = S.tasks.find((x) => x.id === el.dataset.id); if (!t) return;
    run(async () => {
      await q(sb.from('sf_tasks').update({ done: !t.done }).eq('id', t.id));
      if (!t.done) await logUpdate('משימה', 'סיים/ה: ' + t.text);
    });
  },
  saveTask: (el) => {
    const t = S.tasks.find((x) => x.id === el.dataset.id); const d = S.d;
    if (!d.text || !d.text.trim()) return toast('חסר שם למשימה');
    const row = { text: d.text.trim(), owner: d.owner, due: d.due || null, remind: !!d.remind && !!d.due, cal: !!d.cal && !!d.due };
    run(async () => {
      const calChanged = row.cal !== t.cal || (row.cal && (row.due !== t.due || row.text !== t.text || row.owner !== t.owner || row.remind !== t.remind));
      if (calChanged) {
        if (!gToken()) throw new Error('NO_TOKEN');
        row.cal_event_id = await calSync({ ...t, ...row });
      }
      if (row.due !== t.due) row.reminded_at = null;
      await q(sb.from('sf_tasks').update(row).eq('id', t.id));
      S.edit = null;
    }, row.cal && !t.cal ? 'נוסף ליומן' : 'נשמר');
  },
  saveDecision: (el) => {
    const x = S.decisions.find((r) => r.id === el.dataset.id); const d = S.d;
    run(async () => {
      await q(sb.from('sf_decisions').update({ title: d.title.trim() || x.title, note: d.note, status: d.status }).eq('id', x.id));
      if (d.status !== x.status) await logUpdate('החלטה', (d.status === 'סגור' ? 'הוחלט: ' : 'נפתח מחדש: ') + (d.title || x.title) + (d.note ? ' · ' + d.note : ''));
      S.edit = null;
    }, 'נשמר');
  },
  saveCost: (el) => {
    const x = S.costs.find((r) => r.id === el.dataset.id); const d = S.d;
    run(async () => { await q(sb.from('sf_costs').update({ what: d.what.trim() || x.what, amount: num(d.amount), paid_on: d.paid_on || null }).eq('id', x.id)); S.edit = null; }, 'נשמר');
  },
  saveGroup: (el) => {
    const d = S.d; const url = (d.url || '').trim();
    if (url && !/^https:\/\//i.test(url)) return toast('הקישור צריך להתחיל ב־https://');
    run(async () => { await q(sb.from('sf_groups').update({ name: d.name.trim(), url: url }).eq('id', el.dataset.id)); S.edit = null; }, 'נשמר');
  },
  moveStage: (el) => {
    const i = S.stages.findIndex((s) => s.id === el.dataset.id); const j = i + Number(el.dataset.v);
    if (j < 0 || j >= S.stages.length) return;
    const arr = S.stages.slice(); const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    run(async () => { await Promise.all(arr.map((s, k) => (s.position !== k + 1 ? q(sb.from('sf_stages').update({ position: k + 1 }).eq('id', s.id)) : null))); });
  },
  setCurrent: () => {
    const reason = (S.d.reason || '').trim();
    run(async () => { await q(sb.rpc('sf_set_current', { p_stage: S.viewStage, p_reason: reason })); S.sheet = null; }, 'השלב הנוכחי עודכן');
  },
  sourceKind: (el) => run(async () => { await q(sb.from('sf_sources').update({ kind: el.dataset.v }).eq('id', el.dataset.id)); }),
  saveAdd: () => {
    const d = S.d; const type = d.type || 'עדכון'; const text = (d.text || '').trim();
    if (!text) return toast('כתבו משהו קודם');
    if (type === 'הוצאה' && !num(d.amount)) return toast('חסר סכום');
    const file = S.pendingFile;
    run(async () => {
      let files = [];
      if (file) files = [await driveUpload(file, d.folder || DEFAULT_FOLDER[type === 'הוצאה' ? 'cost' : type === 'החלטה' ? 'decision' : 'update'])];
      if (type === 'החלטה') { await q(sb.from('sf_decisions').insert({ title: text, status: d.status || 'פתוח', files: files })); await logUpdate('החלטה', ((d.status || 'פתוח') === 'סגור' ? 'הוחלט: ' : 'החלטה פתוחה: ') + text, files); }
      else if (type === 'הוצאה') { await q(sb.from('sf_costs').insert({ what: text, amount: num(d.amount), paid_on: today(), files: files })); await logUpdate('הוצאה', text + ' · ' + shekel(num(d.amount)), files); }
      else await logUpdate('עדכון', text, files);
      S.sheet = null; S.d = {}; S.pendingFile = null;
    }, 'נשמר');
  },
  enablePush: () => enablePush()
};

/* forms */
const FORMS = {
  magic: async (fd) => {
    const email = String(fd.get('email') || '').trim().toLowerCase();
    const { error } = await sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: BASE } });
    toast(error ? 'שליחה נכשלה: ' + error.message : 'נשלח קישור ל־' + email);
  },
  addTask: (fd) => {
    const text = String(fd.get('text') || '').trim(); if (!text) return;
    const pos = tasksOf(S.viewStage).reduce((m, t) => Math.max(m, t.position), 0) + 1;
    run(async () => { await q(sb.from('sf_tasks').insert({ stage_id: S.viewStage, text: text, owner: S.me.email, position: pos })); });
  },
  addStage: (fd) => {
    const name = String(fd.get('name') || '').trim(); if (!name) return;
    run(async () => { await q(sb.from('sf_stages').insert({ name: name, position: S.stages.length + 1 })); });
  },
  addExtra: (fd) => { const name = String(fd.get('name') || '').trim(); if (name) run(async () => { await q(sb.from('sf_extras').insert({ name: name, position: S.extras.length + 1 })); }); },
  addSource: (fd) => { const name = String(fd.get('name') || '').trim(); if (name) run(async () => { await q(sb.from('sf_sources').insert({ name: name, kind: 'loan', position: S.sources.length + 1 })); }); },
  addGroup: (fd) => { const name = String(fd.get('name') || '').trim(); if (name) run(async () => { await q(sb.from('sf_groups').insert({ name: name, position: S.groups.length + 1 })); }); },
  addCost: (fd) => {
    const what = String(fd.get('what') || '').trim(); const amount = num(fd.get('amount'));
    if (!what || !amount) return toast('חסר תיאור או סכום');
    run(async () => { await q(sb.from('sf_costs').insert({ what: what, amount: amount, paid_on: today() })); await logUpdate('הוצאה', what + ' · ' + shekel(amount)); });
  }
};

/* ---------- events ---------- */
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-a]');
  if (!el || el.disabled) return;
  if (el.dataset.a === 'scrim' && ev.target !== el) return;
  ev.preventDefault();
  const fn = A[el.dataset.a]; if (fn) fn(el, ev);
});
document.addEventListener('submit', (ev) => {
  const f = ev.target.closest('[data-form]'); if (!f) return;
  ev.preventDefault();
  const fn = FORMS[f.dataset.form]; if (fn) fn(new FormData(f));
});
document.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.dataset.f) S.d[el.dataset.f] = el.value;
  if (el.dataset.fin) { S.fin[el.dataset.fin] = el.value; refreshFinOut(); }
  if (el.dataset.save === 'extra' || el.dataset.save === 'source') {
    const list = el.dataset.save === 'extra' ? S.extras : S.sources;
    const row = list.find((r) => r.id === el.dataset.id); if (row) { row[el.dataset.col] = el.value; refreshFinOut(); }
  }
});
document.addEventListener('change', async (ev) => {
  const el = ev.target;
  if (el.dataset.f && el.tagName === 'SELECT') S.d[el.dataset.f] = el.value;
  if (el.dataset.fin) {
    const v = el.value.trim() === '' ? null : num(el.value);
    const { error } = await sb.from('sf_finance').update({ [el.dataset.fin]: v }).eq('id', 1);
    if (error) toast('לא נשמר: ' + error.message);
  }
  if (el.dataset.save) {
    const numeric = ['amount', 'rate', 'years'].includes(el.dataset.col);
    const v = numeric ? (el.value.trim() === '' ? null : num(el.value)) : el.value.trim();
    if (!numeric && !v) return;
    const { error } = await sb.from(TABLE[el.dataset.save]).update({ [el.dataset.col]: v }).eq('id', el.dataset.id);
    if (error) toast('לא נשמר: ' + error.message);
    else if (el.dataset.save === 'stage') { const s = S.stages.find((r) => r.id === el.dataset.id); if (s) s.name = v; }
  }
  if (el.dataset.pick) { S.pendingFile = el.files[0] || null; render(); }
  if (el.dataset.upload) {
    const file = el.files[0]; if (!file) return;
    const kind = el.dataset.upload; const id = el.dataset.id;
    if (!gToken()) return needGoogle('להעלות קבצים ל־Drive');
    const list = { task: S.tasks, decision: S.decisions, cost: S.costs }[kind];
    const row = list.find((r) => r.id === id);
    toast('מעלה ל־Drive…');
    run(async () => {
      const f = await driveUpload(file, S.d.folder || DEFAULT_FOLDER[kind]);
      await q(sb.from(TABLE[kind]).update({ files: (row.files || []).concat([f]) }).eq('id', id));
      await logUpdate('קובץ', f.name + ' נשמר בתיקיית ' + f.folder + ' · ' + (row.text || row.title || row.what), [f]);
    }, 'הקובץ נשמר ב־Drive');
  }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.me && !S.edit && !S.busy) loadAll().then(render).catch(() => {}); });

/* ---------- push ---------- */
function b64ToU8(b) { const p = '='.repeat((4 - (b.length % 4)) % 4); const r = atob((b + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); }
async function enablePush() {
  try {
    if (isIOS() && !standalone()) return toast('באייפון צריך קודם להוסיף למסך הבית ולפתוח מהאייקון');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return toast('ההתראות לא אושרו. אפשר לשנות בהגדרות הטלפון.');
    const reg = await navigator.serviceWorker.ready;
    const cfg = await q(sb.from('sf_config').select('value').eq('name', 'vapid_public').maybeSingle());
    if (!cfg) throw new Error('מפתח ההתראות עוד לא מוכן');
    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(cfg.value) }));
    const j = sub.toJSON();
    await q(sb.from('sf_push_subs').upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, email: S.me.email }));
    lsSet('sf_push_on', '1'); S.sheet = null;
    toast('התראות הופעלו במכשיר הזה');
  } catch (e) { console.error(e); toast('הפעלת התראות נכשלה: ' + (e.message || e)); }
}

/* ---------- boot ---------- */
async function boot(session) {
  S.session = session;
  if (session && session.provider_token) saveGToken(session.provider_token);
  if (!session) { S.me = null; S.ready = true; render(); return; }
  try {
    S.members = await q(sb.from('sf_members').select('*'));
    S.me = S.members.find((m) => m.email === (session.user.email || '').toLowerCase()) || null;
    if (S.me) await loadAll();
  } catch (e) { console.error(e); S.me = null; }
  S.ready = true; render();
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
let booted = false;
sb.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') { S.session = session; return; }
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    if (event === 'SIGNED_IN' && booted && S.me && session && session.provider_token) { saveGToken(session.provider_token); S.session = session; render(); return; }
    booted = true;
    setTimeout(() => boot(session), 0);
  }
});
