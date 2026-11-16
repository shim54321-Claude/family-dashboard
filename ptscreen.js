/* ============================================================
   מסך הנקודות המלא על הלוח (16.11.2026)
   לוגיקה אחת משותפת ללוח (index.html), לאפליקציית הנקודות ול"היום":
   מתי המסך מוצג, ומה ההגדרות שלו. הכול נשמר בטבלת settings:
     points_screen_until       ISO — "הצג עכשיו" עד הרגע הזה
     points_screen_skip_until  ISO — "כבה" באמצע חלון קבוע: לא מציגים עד הרגע הזה
     points_screen_windows     JSON {on:bool, list:[{from:'06:30',to:'07:30',days:[0..5]}]}
     points_screen_effect      stars | fireworks | off   (ברירת מחדל: stars)
     points_goal_effect        2h | always | off         (ברירת מחדל: 2h)
   ימים: 0=ראשון … 5=שישי. בשבת ובחג המסך לא מוצג בכלל.
   ============================================================ */

export const DEFAULT_WINDOWS = { on: false, list: [] };
export const DAY_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];

export function hhmm(v) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(v || '').trim());
  return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null;
}

/** קריאה בטוחה של רשימת החלונות; כל חלון לא תקין נזרק */
export function parseWindows(raw) {
  let v = null;
  try { v = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { v = null; }
  if (!v || typeof v !== 'object') return { on: DEFAULT_WINDOWS.on, list: [] };
  const list = (Array.isArray(v.list) ? v.list : []).map(w => ({
    from: String((w && w.from) || ''), to: String((w && w.to) || ''),
    days: (Array.isArray(w && w.days) ? w.days : []).map(Number).filter(d => d >= 0 && d <= 5),
  })).filter(w => hhmm(w.from) !== null && hhmm(w.to) !== null && hhmm(w.from) < hhmm(w.to));
  return { on: v.on !== false, list };
}

export const effectOf = s => (['stars', 'fireworks', 'off'].includes(s) ? s : 'stars');
export const goalEffectOf = s => (['2h', 'always', 'off'].includes(s) ? s : '2h');

/** החלון הקבוע הפעיל עכשיו (אם יש). il = Date בשעון ישראל (שדות מקומיים) */
export function activeWindow(win, il) {
  if (!win || !win.on) return null;
  const day = il.getDay(), mins = il.getHours() * 60 + il.getMinutes();
  return win.list.find(w => w.days.includes(day) && mins >= hhmm(w.from) && mins < hhmm(w.to)) || null;
}

/** ms של סוף החלון היום, לפי שעון ישראל. nowMs = הזמן האמיתי; il = אותו רגע בשדות ישראל */
export function windowEndMs(w, nowMs, il) {
  const mins = il.getHours() * 60 + il.getMinutes();
  return Math.floor((nowMs + (hhmm(w.to) - mins) * 60000 - il.getSeconds() * 1000) / 60000) * 60000;
}

/**
 * האם המסך מוצג עכשיו.
 * settings: אובייקט key→value. opts: {shabbat:bool}
 * מחזיר {on, why:'now'|'window'|null, untilMs}
 */
export function screenState(settings, nowMs, il, opts = {}) {
  return partState('screen', settings, nowMs, il, opts);
}

/* ============================================================
   סבב 2 (16.11.2026): ארבעה חלקים על הלוח, לכל אחד מתג משלו.
   למשבצות ולמסך המלא יש גם שעון (חלונות זמן).
     משבצות:  board_show_boxes ('0' = מוסתר עד שמדליקים), board_boxes_windows,
              board_boxes_until (הצג עכשיו), board_boxes_skip_until (מוסתר עד סוף החלון)
     מסך מלא: points_screen_enabled ('0' = מוסתר עד שמדליקים) + המפתחות של points_screen_*
     צנצנת:   board_show_jar ('0' = מוסתר)     פסים: board_show_bars ('0' = מוסתר)
   ============================================================ */
export const PARTS = {
  boxes:  { label: 'משבצות הילדים', enabled: 'board_show_boxes', windows: 'board_boxes_windows', until: 'board_boxes_until', skip: 'board_boxes_skip_until', clock: true,
            def: '{"on":true,"list":[{"from":"06:30","to":"07:30","days":[0,1,2,3,4]},{"from":"19:00","to":"19:30","days":[0,1,2,3,4]}]}' },
  jar:    { label: 'הצנצנת המשפחתית', enabled: 'board_show_jar' },
  bars:   { label: 'פסי הנקודות במערכת', enabled: 'board_show_bars' },
  screen: { label: 'מסך הנקודות המלא', enabled: 'points_screen_enabled', windows: 'points_screen_windows', until: 'points_screen_until', skip: 'points_screen_skip_until', clock: true },
};
export const PART_ORDER = ['boxes', 'jar', 'bars', 'screen'];
/** רשימת החלונות של חלק (עם ברירת מחדל אם המפתח עוד לא קיים) */
export function winRaw(part, settings) { const P = PARTS[part]; const v = settings[P.windows]; return (v === undefined || v === null) && P.def ? P.def : v; }

/**
 * מצב חלק אחד עכשיו: {on, why:'now'|'window'|'always'|null, untilMs, disabled, window}
 * disabled = כובה "עד שמדליקים שוב"
 */
export function partState(part, settings, nowMs, il, opts = {}) {
  const P = PARTS[part];
  const disabled = String(settings[P.enabled] ?? '') === '0';
  if (opts.shabbat) return { on: false, why: null, untilMs: null, disabled };
  if (!P.clock) return { on: !disabled, why: disabled ? null : 'always', untilMs: null, disabled };
  const until = Date.parse(settings[P.until] || '') || 0;
  if (until > nowMs) return { on: true, why: 'now', untilMs: until, disabled: false };
  const w = activeWindow(parseWindows(winRaw(part, settings)), il);
  if (disabled) return { on: false, why: null, untilMs: null, disabled: true, window: w || null };
  const skip = Date.parse(settings[P.skip] || '') || 0;
  if (w && !(skip > nowMs)) return { on: true, why: 'window', untilMs: windowEndMs(w, nowMs, il), window: w, disabled: false };
  return { on: false, why: null, untilMs: null, disabled: false, skipped: !!(w && skip > nowMs), window: w || null };
}

/** החלון הבא שמתחיל אחרי עכשיו (עד שבוע קדימה): {dayOffset, from} */
export function nextWindow(win, il) {
  if (!win || !win.on || !win.list.length) return null;
  const today = il.getDay(), mins = il.getHours() * 60 + il.getMinutes();
  for (let off = 0; off < 8; off++) {
    const d = (today + off) % 7;
    const c = win.list.filter(w => w.days.includes(d) && (off > 0 || hhmm(w.from) > mins)).sort((a, b) => hhmm(a.from) - hhmm(b.from))[0];
    if (c) return { dayOffset: off, day: d, from: c.from };
  }
  return null;
}
const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export function nextWindowText(win, il) {
  const n = nextWindow(win, il);
  if (!n) return '';
  return n.dayOffset === 0 ? `הבא היום ${n.from}` : n.dayOffset === 1 ? `הבא מחר ${n.from}` : `הבא ביום ${DAY_NAMES[n.day]} ${n.from}`;
}
