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
  const off = { on: false, why: null, untilMs: null };
  if (opts.shabbat) return off;
  if (String(settings.points_show_kiosk ?? '') === '0') return off;
  const until = Date.parse(settings.points_screen_until || '') || 0;
  if (until > nowMs) return { on: true, why: 'now', untilMs: until };
  const skip = Date.parse(settings.points_screen_skip_until || '') || 0;
  const w = activeWindow(parseWindows(settings.points_screen_windows), il);
  if (w && !(skip > nowMs)) return { on: true, why: 'window', untilMs: windowEndMs(w, nowMs, il), window: w };
  return off;
}
