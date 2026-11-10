-- סבב נקודות + הודעות לפי שעות (10.11.2026)
-- תוספות בלבד: שום טבלה או עמודה קיימת לא נמחקת או משתנה.
-- חזרה לאחור: ROLLBACK-2026-11-10_points_and_timed_messages.sql

-- ילדים: השתתפות בנקודות + צורת תצוגה (מספרים/כוכבים), ניתנים לעריכה מהאפליקציה
alter table public.kids add column if not exists points_enabled boolean not null default true;
alter table public.kids add column if not exists points_display text not null default 'numbers';
do $$ begin
  alter table public.kids add constraint kids_points_display_chk check (points_display in ('numbers','stars'));
exception when duplicate_object then null; end $$;

-- הודעה על כל המסך לפי שעות (רשות). בלי שעות = כל היום, כמו קודם.
alter table public.schedule_overrides add column if not exists start_time time;
alter table public.schedule_overrides add column if not exists end_time time;

-- קטגוריות מעשים
create table if not exists public.point_categories(
  id bigserial primary key,
  name text not null,
  order_index int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- מעשים. kid_ids ריק = לכל הילדים
create table if not exists public.point_actions(
  id bigserial primary key,
  category_id bigint references public.point_categories(id) on delete set null,
  title text not null,
  points int not null check (points between 1 and 100),
  order_index int not null default 0,
  kid_ids int[],
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- יעדים. kid_id ריק = הצנצנת המשפחתית
create table if not exists public.point_goals(
  id bigserial primary key,
  kid_id int references public.kids(id) on delete cascade,
  target int not null check (target > 0),
  prize text not null default '',
  prize_icon text,
  carry_in int not null default 0 check (carry_in >= 0),
  started_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active','redeemed','archived')),
  redeemed_at timestamptz,
  after_redeem text not null default 'repeat' check (after_redeem in ('repeat','choose')),
  needs_setup boolean not null default false,
  created_at timestamptz not null default now()
);
-- יעד פעיל אחד בלבד לכל ילד, ואחד למשפחה
create unique index if not exists point_goals_one_active
  on public.point_goals ((coalesce(kid_id,0))) where status='active';

-- אירועי נקודות. ביטול = undone_at (לא מחיקה), כדי שההיסטוריה תישאר
create table if not exists public.point_events(
  id bigserial primary key,
  kid_id int not null references public.kids(id) on delete cascade,
  points int not null check (points between 1 and 100),
  action_id bigint references public.point_actions(id) on delete set null,
  reason text,
  source text not null default 'app',
  created_at timestamptz not null default now(),
  undone_at timestamptz
);
create index if not exists point_events_kid_time on public.point_events(kid_id, created_at);

-- הרשאות: כמו שאר הלוח — קריאה פתוחה, כתיבה להורה מחובר בלבד
alter table public.point_categories enable row level security;
alter table public.point_actions    enable row level security;
alter table public.point_goals      enable row level security;
alter table public.point_events     enable row level security;
do $$ declare t text; begin
  foreach t in array array['point_categories','point_actions','point_goals','point_events'] loop
    execute format('drop policy if exists read_%1$s on public.%1$s', t);
    execute format('drop policy if exists write_%1$s on public.%1$s', t);
    execute format('create policy read_%1$s on public.%1$s for select using (true)', t);
    execute format('create policy write_%1$s on public.%1$s for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- הגדרות ברירת מחדל (ניתנות לעריכה מהאפליקציה)
insert into public.settings(key,value) values
  ('points_show_kiosk','1'),
  ('points_celebration','once'),
  ('points_celebration_seconds','60'),
  ('points_quick_actions','')
on conflict (key) do nothing;
