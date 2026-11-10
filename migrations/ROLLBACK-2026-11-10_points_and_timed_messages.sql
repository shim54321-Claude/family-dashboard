-- חזרה לאחור לסבב הנקודות + הודעות לפי שעות (10.11.2026)
-- מסיר רק את מה שנוסף בסבב הזה. לא נוגע בשום נתון שהיה קיים קודם.
-- שימו לב: מוחק גם את כל היסטוריית הנקודות שנצברה.
drop table if exists public.point_events;
drop table if exists public.point_goals;
drop table if exists public.point_actions;
drop table if exists public.point_categories;
alter table public.kids drop constraint if exists kids_points_display_chk;
alter table public.kids drop column if exists points_display;
alter table public.kids drop column if exists points_enabled;
alter table public.schedule_overrides drop column if exists start_time;
alter table public.schedule_overrides drop column if exists end_time;
delete from public.settings where key in
  ('points_show_kiosk','points_celebration','points_celebration_seconds','points_quick_actions');
