/* ============================================================
   קוד גישה (15.11.2026) — משותף ל"היום", לבקרה ולנקודות
   * מסך כניסה: גוגל / קוד למייל / (בתקופת המעבר) הסיסמה המשותפת הישנה
   * רק הורה מהרשימה נכנס לאפליקציה. ילד או מייל לא מורשה — מסך "אין הרשאה"
   * פס "מכשיר חדש מבקש גישה" בראש המסך, עם אישור/דחייה
   * mountAccessAdmin — כרטיסי "מכשירים וגישה" בבקרה המלאה
   ============================================================ */

const CSS = `
.acc-login{display:flex;flex-direction:column;gap:10px;margin-top:6px}
.acc-login label{margin:6px 0 0}
.acc-btn{width:100%;min-height:50px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer}
.acc-google{background:var(--card,#fff);color:var(--ink,#16211E);border:1px solid var(--line,#E3E8E4);
  display:flex;align-items:center;justify-content:center;gap:10px}
.acc-google svg{width:20px;height:20px}
.acc-or{display:flex;align-items:center;gap:10px;color:var(--ink-soft,#606E69);font-size:14px;margin:6px 0}
.acc-or::before,.acc-or::after{content:"";flex:1;height:1px;background:var(--line,#E3E8E4)}
.acc-login input{width:100%;box-sizing:border-box}
.acc-code{font-size:26px!important;letter-spacing:8px;text-align:center}
.acc-ltr{direction:ltr;text-align:left}
.acc-legacy{margin-top:8px;border-top:1px solid var(--line,#E3E8E4);padding-top:8px}
.acc-legacy summary{cursor:pointer;font-size:14px;color:var(--ink-soft,#606E69);padding:6px 0}
.acc-foot{font-size:13px;color:var(--ink-soft,#606E69);text-align:center;line-height:1.5}
.acc-hidden{display:none!important}
.acc-noaccess{text-align:center;line-height:1.6}
.acc-noaccess p{margin:10px 0 16px}
.acc-noaccess a{display:inline-block;margin:4px}

#accBanner{display:flex;flex-direction:column;gap:10px;margin:10px auto 0;max-width:720px;padding:0 12px}
#accBanner:empty{display:none}
.acc-req{background:#18211C;color:#fff;border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:12px}
.acc-req h3{margin:0;font-size:18px;display:flex;align-items:center;gap:8px}
.acc-req h3 svg{width:24px;height:24px;flex:none}
.acc-req .acc-row{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.acc-req .acc-lbl{font-size:15px;color:#C9D3CC}
.acc-req .acc-num{font-size:38px;font-weight:800;letter-spacing:8px;direction:ltr;unicode-bidi:isolate}
.acc-req label{color:#C9D3CC;font-size:14px;margin:0}
.acc-req input{width:100%;box-sizing:border-box;font-size:17px;padding:11px 12px;border-radius:12px;border:0;
  background:#fff;color:#18211C}
.acc-req .acc-acts{display:flex;gap:10px}
.acc-req .acc-ok{flex:1;min-height:48px;border-radius:14px;border:0;background:#fff;color:#18211C;font-size:17px;font-weight:800}
.acc-req .acc-no{min-height:48px;padding:0 20px;border-radius:14px;border:1px solid #5B665F;background:transparent;color:#fff;font-size:16px}
.acc-req .acc-note{font-size:13px;color:#A9B5AD}
.acc-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#18211C;color:#fff;
  padding:12px 18px;border-radius:12px;font-size:15px;z-index:999;max-width:90vw;text-align:center}

.acc-admin .acc-list{display:flex;flex-direction:column}
.acc-admin .acc-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line,#E3E8E4);flex-wrap:wrap}
.acc-admin .acc-item:last-child{border-bottom:0}
.acc-admin .acc-grow{flex:1;min-width:160px}
.acc-admin .acc-name{font-weight:700;font-size:16px}
.acc-admin .acc-sub{font-size:13px;color:var(--ink-soft,#606E69)}
.acc-admin .acc-chip{font-size:13px;padding:4px 10px;border-radius:10px;background:var(--soft,#EEF1EC)}
.acc-admin .acc-mail{direction:ltr;unicode-bidi:isolate}
.acc-admin .acc-add{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.acc-admin .acc-add input{flex:2;min-width:180px}
.acc-admin .acc-add select{flex:1;min-width:130px}
.acc-admin .acc-trans{background:#FFF8F0;border:1px solid #E8D3B8;border-radius:14px;padding:14px 16px;color:#5A3A14}
.acc-admin .acc-trans h2{color:#7A4A17}
.acc-admin button.danger{white-space:nowrap}
.acc-admin .acc-btns{display:flex;gap:8px;flex-wrap:nowrap}
.acc-admin .acc-trow{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #E8D3B8;font-weight:700}
.acc-admin .acc-trow:last-of-type{border-bottom:0}
`;

const GOOGLE_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
const SCREEN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/></svg>';

const $ = id => document.getElementById(id);
function el(tag, attrs, ...kids){
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)){
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids) if (c != null) e.append(c);
  return e;
}
function injectCss(){
  if ($('accCss')) return;
  const s = document.createElement('style'); s.id = 'accCss'; s.textContent = CSS;
  document.head.appendChild(s);
}
export function toast(msg){
  const t = el('div', {class:'acc-toast', role:'status', text:msg});
  document.body.appendChild(t); setTimeout(() => t.remove(), 3500);
}
function isNetErr(err){
  const m = String((err && err.message) || err || '');
  return (err && err.name === 'TypeError') || /fetch|network|load failed/i.test(m);
}
function cleanUrlTokens(){
  /* אחרי חזרה מגוגל: מנקים את הכתובת כדי שהקוד לא יישאר בהיסטוריה */
  if (/access_token|error_description|code=/.test(location.hash + location.search)){
    try{ history.replaceState(null, '', location.pathname); }catch(e){}
  }
}

/* ===================== מסך כניסה ===================== */
function buildLogin(root, legacyOn){
  /* משאירים את הכותרת (h1 / מדליה) ומחליפים את טופס הסיסמה */
  [...root.children].forEach(c => { if (!/^H1$/.test(c.tagName) && !c.classList.contains('lmedal')) c.remove(); });
  const box = el('div', {class:'acc-login'},
    el('button', {type:'button', class:'acc-btn acc-google', id:'accGoogle'}, ''),
    el('div', {class:'acc-or', text:'או קוד למייל'}),
    el('label', {for:'accEmail', text:'המייל שלך'}),
    el('input', {type:'email', id:'accEmail', class:'acc-ltr', autocomplete:'email', inputmode:'email', dir:'ltr'}),
    el('button', {type:'button', class:'acc-btn', id:'accSend', text:'שלח לי קוד'}),
    el('div', {id:'accCodeBox', class:'acc-hidden'},
      el('label', {for:'accCode', text:'הקוד שהגיע למייל'}),
      el('input', {id:'accCode', class:'acc-code', inputmode:'numeric', autocomplete:'one-time-code', dir:'ltr', maxlength:'8'}),
      el('button', {type:'button', class:'acc-btn', id:'accVerify', style:'margin-top:10px', text:'כניסה'})),
    el('details', {class:'acc-legacy' + (legacyOn ? '' : ' acc-hidden'), id:'accLegacy'},
      el('summary', {text:'כניסה עם הסיסמה המשותפת הישנה'}),
      el('label', {for:'pass', text:'סיסמה'}),
      el('input', {type:'password', id:'pass', autocomplete:'current-password'}),
      el('button', {type:'button', class:'acc-btn', id:'loginBtn', style:'margin-top:10px', text:'כניסה'})),
    el('div', {class:'msg', id:'loginMsg', role:'status'}),
    el('div', {class:'acc-foot', text:'נכנסים פעם אחת בכל טלפון, והכניסה נשמרת.'}));
  root.appendChild(box);
  $('accGoogle').innerHTML = GOOGLE_SVG + '<span>כניסה עם גוגל</span>';
}

function showNoAccess(root, role, email, db){
  [...root.children].forEach(c => { if (!/^H1$/.test(c.tagName) && !c.classList.contains('lmedal')) c.remove(); });
  const msg = role === 'kid'
    ? 'שלום! עם המייל הזה אפשר כרגע רק לצפות בלוח המשפחה.'
    : 'המייל ' + (email || '') + ' לא נמצא ברשימת המורשים. אפשר לבקש מהורה להוסיף אותו בבקרה המלאה.';
  const out = el('button', {type:'button', class:'ghost', text:'יציאה',
    onclick: async () => { try{ await db.auth.signOut(); }catch(e){} location.reload(); }});
  root.appendChild(el('div', {class:'acc-noaccess'},
    el('p', {text: msg}),
    el('a', {href:'index.html', class:'acc-btn', style:'display:inline-flex;align-items:center;justify-content:center;padding:0 18px;text-decoration:none;background:var(--ink,#16211E);color:var(--bg,#fff)', text:'ללוח המשפחה'}),
    el('div', {style:'margin-top:10px'}, out)));
}

/**
 * parentGate — נקודת הכניסה של כל אפליקציית הורים.
 * start: הפונקציה שמפעילה את האפליקציה אחרי כניסה של הורה.
 * legacyEmail: החשבון המשותף הישן (לתקופת המעבר).
 */
export async function parentGate({db, start, legacyEmail}){
  injectCss();
  const root = $('login');
  let legacyOn = true;
  try{
    const r = await db.rpc('fd_access_info');
    if (!r.error && r.data) legacyOn = r.data.legacy_password !== false;
  }catch(e){}
  buildLogin(root, legacyOn);
  const msg = (t, err) => { const m = $('loginMsg'); m.textContent = t; m.className = 'msg' + (err ? ' err' : ''); };

  /* חזרה מגוגל עם שגיאה (למשל מייל שלא ברשימה) */
  const urlErr = new URLSearchParams((location.hash || '').replace(/^#/, '') + '&' + location.search.replace(/^\?/, '')).get('error_description');
  if (urlErr) msg('המייל הזה לא מורשה להיכנס. אפשר לבקש מהורה להוסיף אותו.', true);

  let started = false, busy = false;
  async function proceed(){
    if (started || busy) return;
    busy = true;
    try{
      const r = await db.rpc('fd_touch_login');
      if (r.error){
        msg(isNetErr(r.error) ? 'אין חיבור לאינטרנט. ננסה שוב כשהחיבור יחזור.' : 'לא ניתן לבדוק הרשאה כרגע.', true);
        return;
      }
      const d = r.data || {};
      cleanUrlTokens();
      if (d.role === 'parent'){
        started = true;
        await start();
        startApprovalBanner(db);
      }else{
        let email = d.email;
        if (!email){ try{ const s = await db.auth.getSession(); email = s.data.session && s.data.session.user.email; }catch(e){} }
        showNoAccess(root, d.role, email, db);
      }
    } finally { busy = false; }
  }
  window.addEventListener('online', () => { if (!started) db.auth.getSession().then(s => { if (s.data.session) proceed(); }); });

  $('accGoogle').onclick = async () => {
    msg('עוברים לגוגל…');
    const {error} = await db.auth.signInWithOAuth({provider:'google',
      options:{redirectTo: location.origin + location.pathname, queryParams:{prompt:'select_account'}}});
    if (error) msg('הכניסה עם גוגל לא הצליחה. נסו קוד למייל.', true);
  };
  let lastSend = 0;
  $('accSend').onclick = async () => {
    const email = $('accEmail').value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ msg('כתבו כתובת מייל תקינה', true); return; }
    if (Date.now() - lastSend < 60000){ msg('אפשר לבקש קוד חדש פעם בדקה', true); return; }
    lastSend = Date.now();
    msg('שולח…');
    const {error} = await db.auth.signInWithOtp({email, options:{shouldCreateUser:true}});
    if (error && (error.status === 429 || /rate|seconds/i.test(error.message || ''))){ msg('ביקשתם הרבה קודים. נסו שוב בעוד כמה דקות.', true); return; }
    if (error && isNetErr(error)){ msg('אין חיבור לאינטרנט', true); lastSend = 0; return; }
    /* אותה הודעה לכולם — כך אי אפשר לבדוק אילו מיילים ברשימה */
    msg('אם המייל מורשה, נשלח אליו קוד. בדקו את תיבת הדואר (וגם בספאם).');
    $('accCodeBox').classList.remove('acc-hidden');
    $('accCode').focus();
  };
  $('accEmail').onkeydown = e => { if (e.key === 'Enter') $('accSend').click(); };
  $('accVerify').onclick = async () => {
    const email = $('accEmail').value.trim().toLowerCase();
    const token = $('accCode').value.replace(/\D/g, '');
    if (token.length < 6){ msg('הקוד צריך להיות 6 ספרות לפחות', true); return; }
    msg('בודק…');
    const {error} = await db.auth.verifyOtp({email, token, type:'email'});
    if (error){ msg('הקוד שגוי או שפג תוקפו. אפשר לבקש קוד חדש.', true); return; }
    proceed();
  };
  $('accCode').onkeydown = e => { if (e.key === 'Enter') $('accVerify').click(); };
  $('loginBtn').onclick = async () => {
    msg('מתחבר…');
    const {error} = await db.auth.signInWithPassword({email: legacyEmail, password: $('pass').value});
    if (error){ msg('סיסמה שגויה', true); $('pass').select(); return; }
    proceed();
  };
  $('pass').onkeydown = e => { if (e.key === 'Enter') $('loginBtn').click(); };

  db.auth.onAuthStateChange((ev, session) => { if (ev === 'SIGNED_IN' && session) setTimeout(proceed, 0); });
  const {data:{session}} = await db.auth.getSession();
  if (session) await proceed();
}

/* ===================== פס אישור מכשירים ===================== */
export function guessDeviceName(ua){
  ua = String(ua || '');
  if (/Android TV|AFT|MiBOX|MiTV|BRAVIA|SmartTV|GoogleTV|Fully/i.test(ua)) return 'קיוסק טלוויזיה';
  if (/iPhone/i.test(ua)) return 'אייפון';
  if (/iPad/i.test(ua)) return 'אייפד';
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'טלפון אנדרואיד' : 'טאבלט אנדרואיד';
  if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) return 'מחשב';
  return 'מכשיר';
}
const REASONS = {
  expired: 'הבקשה כבר פגה. במכשיר יופיע קוד חדש.',
  full: 'יש כבר 20 מכשירים מאושרים. בטלו גישה למכשיר ישן בבקרה המלאה ואז אשרו שוב.',
  not_found: 'המכשיר לא נמצא.', empty: 'צריך לתת שם.'
};
let bannerTimer = null;
export function startApprovalBanner(db){
  injectCss();
  let host = $('accBanner');
  if (!host){
    host = el('div', {id:'accBanner', 'aria-live':'polite'});
    const nav = document.querySelector('#panel .navbar');
    if (nav) nav.after(host); else ($('panel') || document.body).prepend(host);
  }
  const drafts = {};
  async function refresh(){
    if (document.activeElement && host.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
    const r = await db.from('fd_devices').select('id,pair_code,expires_at,user_agent,created_at')
      .eq('status', 'pending').order('created_at');
    if (r.error) return;
    const now = Date.now();
    const list = (r.data || []).filter(d => new Date(d.expires_at).getTime() > now);
    host.textContent = '';
    list.forEach(d => {
      const inp = el('input', {id:'accName_' + d.id, value: drafts[d.id] || guessDeviceName(d.user_agent), maxlength:'40'});
      inp.addEventListener('input', () => { drafts[d.id] = inp.value; });
      const card = el('section', {class:'acc-req', 'aria-label':'מכשיר חדש מבקש גישה'},
        el('h3', null, ''),
        el('div', {class:'acc-row'}, el('span', {class:'acc-lbl', text:'הקוד שעל המסך:'}), el('span', {class:'acc-num', text:d.pair_code})),
        el('label', {for:inp.id, text:'שם למכשיר'}), inp,
        el('div', {class:'acc-acts'},
          el('button', {type:'button', class:'acc-ok', text:'אשר', onclick: async () => {
            const name = inp.value.trim() || guessDeviceName(d.user_agent);
            if (!confirm('לאשר את המכשיר "' + name + '" עם הקוד ' + d.pair_code + '?\nהמכשיר יוכל לצפות בלוח המשפחה.')) return;
            const x = await db.rpc('fd_device_approve', {p_id:d.id, p_name:name});
            if (x.error) toast('האישור נכשל: ' + x.error.message);
            else if (x.data && x.data.ok) toast('המכשיר "' + name + '" אושר');
            else toast(REASONS[x.data && x.data.reason] || 'האישור נכשל');
            delete drafts[d.id]; refresh(); document.dispatchEvent(new CustomEvent('acc-changed'));
          }}),
          el('button', {type:'button', class:'acc-no', text:'דחה', onclick: async () => {
            if (!confirm('לדחות את הבקשה עם הקוד ' + d.pair_code + '?')) return;
            const x = await db.rpc('fd_device_reject', {p_id:d.id});
            toast(x.data && x.data.ok ? 'הבקשה נדחתה' : (REASONS[x.data && x.data.reason] || 'לא הצליח'));
            refresh();
          }})),
        el('div', {class:'acc-note', text:'הקוד לא תואם למה שרואים במסך? לחצו דחה.'}));
      card.querySelector('h3').innerHTML = SCREEN_SVG + '<span>מכשיר חדש מבקש גישה</span>';
      host.appendChild(card);
    });
  }
  refresh();
  clearInterval(bannerTimer);
  bannerTimer = setInterval(refresh, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  return {refresh};
}

/* ===================== בקרה: מכשירים וגישה ===================== */
function lastSeenText(iso){
  if (!iso) return 'עוד לא נראה';
  const m = (Date.now() - new Date(iso).getTime()) / 60000;
  if (m < 10) return 'פעיל עכשיו';
  if (m < 60) return 'נראה לפני ' + Math.round(m) + ' דקות';
  const h = m / 60;
  if (h < 24) return 'נראה לפני ' + Math.round(h) + ' שעות';
  const d = Math.floor(h / 24);
  if (d === 1) return 'נראה אתמול';
  return 'לא נראה ' + d + ' ימים';
}
function dmy(iso){ const d = new Date(iso); return d.getDate() + '.' + (d.getMonth() + 1); }

export async function mountAccessAdmin(db, root){
  injectCss();
  root.classList.add('acc-admin');
  let myEmail = '';
  try{ const s = await db.auth.getSession(); myEmail = (s.data.session && s.data.session.user.email || '').toLowerCase(); }catch(e){}

  async function render(){
    const [dv, us, kd, info] = await Promise.all([
      db.from('fd_devices').select('id,name,approved_at,last_seen').eq('status', 'approved').order('approved_at'),
      db.from('fd_allowed_users').select('email,role,kid_id,legacy,last_login_at').order('created_at'),
      db.from('kids').select('id,name').order('order_index'),
      db.rpc('fd_access_info'),
    ]);
    root.textContent = '';
    if (dv.error || us.error){ root.append(el('div', {class:'card'}, el('p', {text:'לא ניתן לטעון את רשימת הגישה כרגע.'}))); return; }
    const kids = kd.data || [];
    const kidName = id => (kids.find(k => k.id === id) || {}).name || '';
    const devices = dv.data || [];
    const users = us.data || [];
    const legacyOn = !(info.data && info.data.legacy_password === false);

    /* --- מכשירים --- */
    const list = el('div', {class:'acc-list'});
    if (!devices.length) list.append(el('div', {class:'acc-sub', text:'עוד אין מכשירים מאושרים.'}));
    devices.forEach(d => {
      const nameBox = el('div', {class:'acc-grow'},
        el('div', {class:'acc-name', text:d.name || 'מכשיר'}),
        el('div', {class:'acc-sub', text:'אושר ' + dmy(d.approved_at) + ' · ' + lastSeenText(d.last_seen)}));
      const ren = el('button', {type:'button', class:'ghost', text:'שינוי שם', onclick: async () => {
        const nm = prompt('שם חדש למכשיר:', d.name || '');
        if (nm == null || !nm.trim() || nm.trim() === d.name) return;
        if (!confirm('לשנות את השם ל"' + nm.trim() + '"?')) return;
        const x = await db.rpc('fd_device_rename', {p_id:d.id, p_name:nm.trim()});
        toast(x.data && x.data.ok ? 'השם עודכן' : (REASONS[x.data && x.data.reason] || 'לא הצליח')); render();
      }});
      const rev = el('button', {type:'button', class:'danger', text:'בטל גישה', onclick: async () => {
        if (!confirm('לבטל את הגישה של "' + (d.name || 'מכשיר') + '"?\nהמכשיר יחזור למסך הנעילה בתוך דקה.')) return;
        const x = await db.rpc('fd_device_revoke', {p_id:d.id});
        toast(x.data && x.data.ok ? 'הגישה בוטלה' : 'לא הצליח'); render();
      }});
      list.append(el('div', {class:'acc-item'}, nameBox, el('div', {class:'acc-btns'}, ren, rev)));
    });
    root.append(el('div', {class:'card'},
      el('h2', {text:'מכשירים מאושרים · ' + devices.length + ' מתוך 20'}),
      el('div', {class:'hint', text:'מכשיר חדש מציג קוד, ומאשרים אותו מהפס שקופץ בראש המסך. עד 2 בקשות ממתינות בבת אחת.'}),
      list));

    /* --- מי יכול להיכנס --- */
    const ulist = el('div', {class:'acc-list'});
    users.filter(u => !u.legacy).forEach(u => {
      const chip = u.role === 'parent' ? 'הורה' : ('ילד · ' + kidName(u.kid_id));
      const row = el('div', {class:'acc-item'},
        el('div', {class:'acc-grow'}, el('span', {class:'acc-mail', text:u.email})),
        el('span', {class:'acc-chip', text:chip}));
      if (u.email !== myEmail){
        row.append(el('button', {type:'button', class:'danger', text:'הסר', 'aria-label':'הסר את ' + u.email, onclick: async () => {
          if (!confirm('להסיר את ' + u.email + ' מרשימת המורשים?')) return;
          const x = await db.rpc('fd_user_remove', {p_email:u.email});
          const r = x.data && x.data.reason;
          toast(x.data && x.data.ok ? 'הוסר' : r === 'last_parent' ? 'חייב להישאר לפחות הורה אחד' : r === 'self' ? 'אי אפשר להסיר את עצמך' : 'לא הצליח');
          render();
        }}));
      }
      ulist.append(row);
    });
    const roleSel = el('select', {id:'accRole', 'aria-label':'תפקיד'},
      el('option', {value:'parent', text:'הורה'}),
      ...kids.map(k => el('option', {value:'kid:' + k.id, text:'ילד — ' + k.name})));
    const mail = el('input', {id:'accNewMail', type:'email', dir:'ltr', placeholder:'מייל חדש', 'aria-label':'מייל חדש'});
    const add = el('button', {type:'button', text:'הוסף', onclick: async () => {
      const e = mail.value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)){ toast('כתבו כתובת מייל תקינה'); return; }
      const v = roleSel.value, role = v === 'parent' ? 'parent' : 'kid', kid = role === 'kid' ? +v.split(':')[1] : null;
      const label = role === 'parent' ? 'הורה (יכול לערוך הכול)' : 'ילד — ' + kidName(kid) + ' (צפייה בלוח בלבד)';
      if (!confirm('להוסיף את ' + e + ' בתור ' + label + '?')) return;
      const x = await db.rpc('fd_user_add', {p_email:e, p_role:role, p_kid:kid});
      const r = x.data && x.data.reason;
      toast(x.data && x.data.ok ? 'נוסף. בפעם הראשונה נכנסים עם גוגל או עם קוד למייל.' : r === 'exists' ? 'המייל כבר ברשימה' : 'לא הצליח');
      render();
    }});
    root.append(el('div', {class:'card'},
      el('h2', {text:'מי יכול להיכנס'}),
      el('div', {class:'hint', text:'הורה יכול לערוך הכול. ילד יכול כרגע רק לצפות בלוח המשפחה.'}),
      ulist,
      el('div', {class:'acc-add'}, mail, roleSel, add),
      el('div', {class:'hint', style:'margin-top:8px', text:'רק הורה יכול להוסיף או להסיר, ותמיד עם אישור. אי אפשר להסיר את עצמך.'})));

    /* --- תקופת מעבר --- */
    if (legacyOn){
      const parents = users.filter(u => u.role === 'parent' && !u.legacy);
      const rows = parents.map(u => el('div', {class:'acc-trow'},
        el('bdi', {class:'acc-mail', text:u.email}), el('span', {text: u.last_login_at ? 'נכנס/ה ✓' : 'עוד לא'})));
      root.append(el('div', {class:'card acc-trans'},
        el('h2', {text:'תקופת מעבר'}),
        el('div', {text:'הסיסמה המשותפת הישנה עדיין עובדת.'}),
        ...rows,
        el('div', {class:'hint', style:'margin-top:6px;color:#5A3A14', text:'כשליד כל ההורים מופיע ✓, אפשר לבטל את הסיסמה הישנה (דרך Claude).'})));
    }
  }
  await render();
  document.addEventListener('acc-changed', render);
  return {refresh: render};
}
