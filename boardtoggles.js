/* ============================================================
   "מה מוצג על הלוח" — ארבעה מתגים (16.11.2026, סבב 2)
   אותו רכיב ב"היום" (daily.html) ובאפליקציית הנקודות (points.html).
   משבצות ומסך מלא: מכבים → "עד סוף החלון" / "עד שמדליקים שוב";
   מדליקים מחוץ לשעות → בוחרים לכמה זמן. צנצנת ופסים: מתג פשוט.
   ============================================================ */
import { PARTS, PART_ORDER, partState, parseWindows, activeWindow, windowEndMs, nextWindowText, hhmm, winRaw } from './ptscreen.js';

const TZ = 'Asia/Jerusalem';
const HM = new Intl.DateTimeFormat('he-IL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const hm = t => HM.format(new Date(t));
/** Date שהשדות המקומיים שלו = השעה בישראל */
function ilNow() {
  const p = {};
  new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    .formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
  return new Date(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CSS = `
.btg{background:var(--card,#fff);border:1px solid var(--line,#E0E5DF);border-radius:18px;padding:12px 16px 4px;margin-bottom:12px}
.btg h2{margin:0 0 2px;font-size:17px}
.btg .btr{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line,#EEF1EC);cursor:pointer}
.btg .btr:last-child{border-bottom:0}
.btg .btn{flex:1;min-width:0}
.btg .btn b{display:block;font-size:16px}
.btg .btn small{display:block;font-size:13px;color:var(--ink-soft,#6E7A74)}
.btg .btr.on .btn small{color:#2E6B47}
.btg .clk{font-size:12px;font-weight:600;color:var(--ink-soft,#4A564F)}
.btg .bsw{flex:none;width:50px;height:30px;border-radius:30px;background:#C9D1CB;position:relative;border:0;padding:0;min-height:0}
.btg .bsw::after{content:"";position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:22px;background:#fff;transition:all .15s}
.btg .btr.on .bsw{background:#2E8B57}
.btg .btr.on .bsw::after{right:24px}
.btsh{position:fixed;inset:0;z-index:120;display:flex;align-items:flex-end;justify-content:center;background:rgba(15,22,19,.45)}
.btsh .in{width:100%;max-width:520px;background:var(--card,#fff);color:var(--ink,#18211C);border-radius:22px 22px 0 0;padding:20px 18px calc(22px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:10px}
.btsh h3{margin:0;font-size:19px}
.btsh p{margin:0;font-size:14px;color:var(--ink-soft,#4A564F)}
.btsh .opt{min-height:48px;border-radius:12px;border:1px solid var(--line,#D5DCD6);background:var(--card,#fff);color:var(--ink,#18211C);font-weight:800;font-size:16px;text-align:start;padding:0 14px}
.btsh .opt.pri{background:var(--ink,#18211C);color:var(--bg,#fff);border-color:var(--ink,#18211C)}
.btsh .durs{display:flex;gap:8px}
.btsh .durs button{flex:1;min-height:44px;border-radius:12px;border:1px solid var(--line,#D5DCD6);background:var(--card,#fff);color:var(--ink,#18211C);font-size:15px;padding:0}
.btsh .durs button.on{background:var(--ink,#18211C);color:var(--bg,#fff);border-color:var(--ink,#18211C);font-weight:700}
.btsh input[type=time]{min-height:44px;font-size:16px}
.btsh .go{min-height:48px;border-radius:12px;border:0;background:#2E8B57;color:#fff;font-weight:800;font-size:16px}
.btsh .cancel{min-height:44px;border:0;background:transparent;color:var(--ink-soft,#4A564F);font-size:15px}
.btsh .hidden{display:none}
`;
function injectCss() {
  if (document.getElementById('btgCss')) return;
  const st = document.createElement('style'); st.id = 'btgCss'; st.textContent = CSS; document.head.appendChild(st);
}

/** חלונית תחתונה. resolve(value) או null בביטול */
function sheet({ title, body, options = [], durations = false }) {
  return new Promise(res => {
    const el = document.createElement('div');
    el.className = 'btsh'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', title);
    let mins = 30;
    el.innerHTML = `<div class="in"><h3>${esc(title)}</h3>${body ? `<p>${esc(body)}</p>` : ''}` +
      options.map((o, i) => `<button type="button" class="opt${o.primary ? ' pri' : ''}" data-i="${i}">${esc(o.label)}</button>`).join('') +
      (durations ? `<div class="durs"><button type="button" data-m="10">10 דק׳</button><button type="button" data-m="30" class="on">30 דק׳</button><button type="button" data-m="60">שעה</button><button type="button" data-m="until">עד שעה…</button></div>
        <input type="time" class="hidden" aria-label="עד שעה"><button type="button" class="go">הצג 30 דקות</button>` : '') +
      `<button type="button" class="cancel">ביטול</button></div>`;
    const done = v => { el.remove(); document.removeEventListener('keydown', onKey); res(v); };
    const onKey = e => { if (e.key === 'Escape') done(null); };
    document.addEventListener('keydown', onKey);
    el.addEventListener('click', e => { if (e.target === el) done(null); });
    el.querySelector('.cancel').onclick = () => done(null);
    el.querySelectorAll('.opt').forEach(b => b.onclick = () => done(options[+b.dataset.i].value));
    if (durations) {
      const inp = el.querySelector('input[type=time]'), go = el.querySelector('.go');
      const target = () => {
        if (mins !== 'until') return Math.floor((Date.now() + mins * 60000) / 60000) * 60000;
        const t = hhmm(inp.value); if (t === null) return null;
        const n = ilNow();
        return Math.floor((Date.now() + (t - (n.getHours() * 60 + n.getMinutes())) * 60000 - n.getSeconds() * 1000) / 60000) * 60000;
      };
      const label = () => {
        const t = target();
        go.textContent = mins === 'until' ? (t ? `הצג עד ${hm(t)}` : 'הצג עד השעה') : `${mins === 60 ? 'הצג שעה' : `הצג ${mins} דקות`} · עד ${hm(target())}`;
      };
      el.querySelectorAll('.durs button').forEach(b => b.onclick = () => {
        mins = b.dataset.m === 'until' ? 'until' : +b.dataset.m;
        el.querySelectorAll('.durs button').forEach(x => x.classList.toggle('on', x === b));
        inp.classList.toggle('hidden', mins !== 'until'); if (mins === 'until') inp.focus();
        label();
      });
      inp.oninput = label;
      go.onclick = () => {
        const t = target();
        if (t === null) { inp.focus(); return; }
        if (t <= Date.now()) { go.textContent = 'השעה כבר עברה'; return; }
        done({ untilMs: t });
      };
      label();
    }
    document.body.appendChild(el);
    (el.querySelector('.opt,.durs button.on') || el.querySelector('.cancel')).focus();
  });
}

export function statusText(part, S) {
  const P = PARTS[part], il = ilNow(), st = partState(part, S, Date.now(), il);
  if (!P.clock) return st.on ? 'מוצג' : 'מוסתר';
  if (st.on) return `מוצג עכשיו · עד ${hm(st.untilMs)}${st.why === 'window' ? ' (חלון קבוע)' : ''}`;
  if (st.disabled) return 'מוסתר עד שמדליקים';
  if (st.skipped && st.window) return `מוסתר עד סוף החלון · ${st.window.to}`;
  const n = nextWindowText(parseWindows(winRaw(part, S)), il);
  return n ? `מוסתר · ${n}` : 'מוסתר · אין שעות קבועות';
}

/**
 * opts: {db, settings:()=>obj, ask(title,body,{danger,yes}), toast(msg,bad), source, onChange()}
 */
export function mountBoardToggles(host, opts) {
  injectCss();
  const S = () => opts.settings() || {};
  async function save(pairs, intent) {
    const rows = Object.entries(pairs).map(([key, value]) => ({ key, value: String(value) }));
    const { error } = await opts.db.from('settings').upsert(rows);
    if (error) { opts.toast('לא נשמר', true); return false; }
    rows.forEach(r => { S()[r.key] = r.value; });
    try {
      await opts.db.from('audit_log').insert({ intent, entity: 'settings', action: 'upsert', new_value: pairs, verification_result: 'ok', source: opts.source || 'app' });
    } catch (_) {}
    opts.toast('נשמר · על הלוח תוך דקה');
    render(); if (opts.onChange) opts.onChange();
    return true;
  }
  async function click(part) {
    const P = PARTS[part], s = S(), il = ilNow(), st = partState(part, s, Date.now(), il);
    if (!P.clock) {
      const on = !st.on;
      if (!(await opts.ask(on ? 'הצגה על הלוח' : 'הסתרה מהלוח', `${on ? 'להציג' : 'להסתיר'} את ${P.label}${on ? ' על הלוח' : ' מהלוח'}?`, { danger: !on, yes: on ? 'הצגה' : 'הסתרה' }))) return;
      await save({ [P.enabled]: on ? '1' : '0' }, `board ${part} ${on ? 'show' : 'hide'}`);
      return;
    }
    const full = part === 'screen';
    if (st.on) {
      const w = activeWindow(parseWindows(winRaw(part, s)), il);
      const endIso = w ? new Date(windowEndMs(w, Date.now(), il)).toISOString() : '';
      const first = st.why === 'window'
        ? { label: `עד סוף החלון · ${hm(st.untilMs)}`, value: 'window' }
        : { label: w ? `עד סוף החלון · ${w.to}` : 'עד החלון הבא', value: 'window' };
      const v = await sheet({ title: `להסתיר את ${P.label}?`, body: full ? 'הלוח חוזר למסך הרגיל תוך דקה.' : 'יורד מהלוח תוך דקה.',
        options: [{ ...first, primary: true }, { label: 'עד שמדליקים שוב', value: 'off' }] });
      if (!v) return;
      if (v === 'window') await save({ [P.until]: '', [P.skip]: endIso }, `board ${part} hide until window end`);
      else await save({ [P.enabled]: '0', [P.until]: '', [P.skip]: '' }, `board ${part} hide until turned on`);
      return;
    }
    if (st.window) { // בתוך חלון, אבל מוסתר — מחזירים לחלון
      if (!(await opts.ask('הצגה על הלוח', `להציג שוב את ${P.label}? מוצג עד סוף החלון (${st.window.to}).`, { danger: false, yes: 'הצגה' }))) return;
      await save({ [P.enabled]: '1', [P.skip]: '' }, `board ${part} show (window)`);
      return;
    }
    const r = await sheet({ title: `להציג את ${P.label} עכשיו?`, body: full ? 'הלוח כולו יתחלף למסך הנקודות, ויחזור לבד בסוף הזמן.' : 'עכשיו מחוץ לשעות הקבועות. לכמה זמן?', durations: true });
    if (!r) return;
    await save({ [P.enabled]: '1', [P.until]: new Date(r.untilMs).toISOString(), [P.skip]: '' }, `board ${part} show now`);
  }
  function render() {
    const s = S(), il = ilNow();
    host.innerHTML = `<div class="btg"><h2>מה מוצג על הלוח</h2>` + PART_ORDER.map(part => {
      const P = PARTS[part], st = partState(part, s, Date.now(), il);
      return `<div class="btr${st.on ? ' on' : ''}" data-part="${part}"><div class="btn"><b>${P.label}${P.clock ? ' <span class="clk">🕒 לפי שעון</span>' : ''}</b><small>${esc(statusText(part, s))}</small></div>` +
        `<button type="button" class="bsw" role="switch" aria-checked="${st.on}" aria-label="${P.label}"></button></div>`;
    }).join('') + `</div>`;
    host.querySelectorAll('.btr').forEach(r => r.onclick = () => click(r.dataset.part));
  }
  render();
  setInterval(render, 30000);
  return { render };
}
