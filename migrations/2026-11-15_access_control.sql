-- קוד גישה ללוח המשפחה — שלב א' (15.11.2026)
-- * מכשירי צפייה מאושרים בקוד זיווג מהטלפון של הורה (עד 2 ממתינים, עד 20 מאושרים)
-- * רשימת מיילים עם תפקיד (הורה / ילד). רק הורה כותב. ילד רק צופה.
-- * שלב א': הקריאה עדיין פתוחה לכולם (fd_access_config.locked=false) — שום דבר לא ננעל.
--   שלב ב' = fd_access_finalize() — רק אחרי ששני ההורים נכנסו בדרך החדשה.
-- * הכתיבה כבר עכשיו רק להורה מהרשימה (כולל החשבון המשותף הישן בתקופת המעבר).
-- * טבלאות sf_* (קומה שניה) לא נוגעים בהן.
-- חזרה לאחור: ROLLBACK-2026-11-15_access_control.sql

-- ===== טבלאות =====
create table if not exists public.fd_access_config(
  id int primary key default 1 check (id = 1),
  locked boolean not null default false,          -- שלב ב': true
  legacy_password boolean not null default true,  -- הסיסמה המשותפת הישנה עדיין עובדת
  updated_at timestamptz not null default now()
);
insert into public.fd_access_config(id) values (1) on conflict (id) do nothing;

create table if not exists public.fd_allowed_users(
  email text primary key check (email = lower(email) and email like '%_@_%'),
  role text not null check (role in ('parent','kid')),
  kid_id int references public.kids(id) on delete cascade,
  legacy boolean not null default false,          -- החשבון המשותף הישן
  last_login_at timestamptz,                      -- כניסה ראשונה בדרך החדשה (גוגל / קוד למייל)
  created_at timestamptz not null default now(),
  created_by text,
  constraint fd_allowed_users_kid_chk check ((role = 'kid') = (kid_id is not null))
);
-- שני ההורים = שני החברים שכבר רשומים בפרויקט קומה שניה; והחשבון המשותף הישן לתקופת המעבר
insert into public.fd_allowed_users(email, role, legacy, created_by)
  select lower(email), 'parent', false, 'migration' from public.sf_members
on conflict (email) do nothing;
insert into public.fd_allowed_users(email, role, legacy, created_by)
  values ('parents@cohen.family','parent',true,'migration')
on conflict (email) do nothing;

create table if not exists public.fd_devices(
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  status text not null check (status in ('pending','approved','rejected','revoked')),
  pair_code text check (pair_code ~ '^[0-9]{4}$'),
  name text,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  approved_at timestamptz,
  approved_by text,
  last_seen timestamptz
);
create index if not exists fd_devices_status on public.fd_devices(status, expires_at);

alter table public.fd_access_config enable row level security;
alter table public.fd_allowed_users enable row level security;
alter table public.fd_devices       enable row level security;

-- ===== פונקציות עזר =====
create or replace function public.fd_hash(t text) returns text
language sql immutable set search_path = '' as
$$ select encode(extensions.digest(coalesce(t,''), 'sha256'), 'hex') $$;

create or replace function public.fd_jwt_email() returns text
language sql stable set search_path = '' as
$$ select lower(coalesce(auth.jwt()->>'email', '')) $$;

-- התפקיד של המשתמש המחובר: 'parent' / 'kid' / null
create or replace function public.fd_role() returns text
language sql stable security definer set search_path = '' as
$$ select u.role from public.fd_allowed_users u
   where u.email = public.fd_jwt_email()
     and coalesce(auth.jwt()->>'role','') = 'authenticated'
     and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false $$;

create or replace function public.fd_is_parent() returns boolean
language sql stable security definer set search_path = '' as
$$ select coalesce(public.fd_role() = 'parent', false) $$;

-- מכשיר מאושר: המפתח הסודי של המכשיר מגיע בכותרת x-device-token
create or replace function public.fd_device_ok() returns boolean
language sql stable security definer set search_path = '' as
$$ select exists(
     select 1 from public.fd_devices d
     where d.status = 'approved'
       and d.token_hash = public.fd_hash(nullif(
             coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json->>'x-device-token', ''))) $$;

create or replace function public.fd_can_read() returns boolean
language sql stable security definer set search_path = '' as
$$ select public.fd_role() is not null
       or public.fd_device_ok()
       or not coalesce((select c.locked from public.fd_access_config c where c.id = 1), true) $$;

-- ===== הרשאות על טבלאות הגישה עצמן =====
drop policy if exists fd_config_read on public.fd_access_config;
create policy fd_config_read on public.fd_access_config for select using (true);
drop policy if exists fd_users_read on public.fd_allowed_users;
create policy fd_users_read on public.fd_allowed_users for select to authenticated using ((select public.fd_is_parent()));
drop policy if exists fd_devices_read on public.fd_devices;
create policy fd_devices_read on public.fd_devices for select to authenticated using ((select public.fd_is_parent()));
-- אין מדיניות כתיבה: כל שינוי עובר רק דרך הפונקציות למטה

-- ===== הרשאות על כל טבלאות הלוח (לא sf_*, לא fd_*) =====
do $$
declare t text; p record;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relname not like 'sf\_%' and c.relname not like 'fd\_%'
  loop
    for p in select polname from pg_policy where polrelid = format('public.%I', t)::regclass loop
      execute format('drop policy %I on public.%I', p.polname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy fd_read on public.%I for select using ((select public.fd_can_read()))', t);
    execute format('create policy fd_write on public.%I for all to authenticated using ((select public.fd_is_parent())) with check ((select public.fd_is_parent()))', t);
  end loop;
end $$;

-- תמונות (הודעות על המסך): קריאה נשארת ציבורית (תמונה ב-<img>), כתיבה רק להורה
drop policy if exists "auth manage photos" on storage.objects;
drop policy if exists fd_photos_write on storage.objects;
create policy fd_photos_write on storage.objects for all to authenticated
  using (bucket_id = 'photos' and (select public.fd_is_parent()))
  with check (bucket_id = 'photos' and (select public.fd_is_parent()));

-- ===== מכשיר: בקשת גישה / מצב =====
create or replace function public.fd_device_request(p_token text, p_ua text default null) returns json
language plpgsql security definer set search_path = '' as $$
declare
  h text; d public.fd_devices; n int; c text; tries int := 0; b bytea;
  lk boolean := coalesce((select x.locked from public.fd_access_config x where x.id = 1), true);
begin
  if p_token is null or length(p_token) < 32 or length(p_token) > 128 or p_token !~ '^[A-Za-z0-9_-]+$' then
    return json_build_object('status','invalid','locked',lk);
  end if;
  h := public.fd_hash(p_token);

  select * into d from public.fd_devices where token_hash = h;
  if found and d.status = 'approved' then
    update public.fd_devices set last_seen = now()
      where id = d.id and (last_seen is null or last_seen < now() - interval '5 minutes');
    return json_build_object('status','approved','locked',lk,'name',d.name);
  end if;
  if found and d.status = 'pending' and d.expires_at > now() then
    return json_build_object('status','pending','code',d.pair_code,'expires_at',d.expires_at,'locked',lk);
  end if;

  -- צריך מקום חדש בתור: נעילה כדי שהמגבלה של 2 תיאכף גם בבקשות במקביל
  perform pg_advisory_xact_lock(hashtext('fd_device_request'));
  delete from public.fd_devices where status = 'pending' and expires_at < now() - interval '1 day';
  delete from public.fd_devices where status in ('rejected','revoked') and created_at < now() - interval '60 days';
  select count(*) into n from public.fd_devices
    where status = 'pending' and expires_at > now() and token_hash <> h;
  if n >= 2 then
    return json_build_object('status','busy','locked',lk);
  end if;
  loop
    b := extensions.gen_random_bytes(2);
    c := lpad(((get_byte(b,0) * 256 + get_byte(b,1)) % 10000)::text, 4, '0');
    exit when not exists(select 1 from public.fd_devices
                         where status = 'pending' and expires_at > now() and pair_code = c and token_hash <> h);
    tries := tries + 1;
    if tries > 50 then return json_build_object('status','busy','locked',lk); end if;
  end loop;
  insert into public.fd_devices(token_hash, status, pair_code, user_agent, created_at, expires_at)
    values (h, 'pending', c, left(p_ua, 200), now(), now() + interval '10 minutes')
  on conflict (token_hash) do update
    set status = 'pending', pair_code = excluded.pair_code, user_agent = excluded.user_agent,
        created_at = now(), expires_at = excluded.expires_at, name = null, approved_at = null, approved_by = null;
  return json_build_object('status','pending','code',c,'expires_at',now() + interval '10 minutes','locked',lk);
end $$;

-- מצב הגישה הכללי (למסך הכניסה): נעול? הסיסמה הישנה פעילה?
create or replace function public.fd_access_info() returns json
language sql stable security definer set search_path = '' as
$$ select json_build_object('locked', c.locked, 'legacy_password', c.legacy_password)
   from public.fd_access_config c where c.id = 1 $$;

-- ===== משתמש מחובר =====
-- נקרא אחרי כל כניסה: מחזיר תפקיד, ומסמן כניסה בדרך החדשה (לכרטיס "תקופת מעבר")
create or replace function public.fd_touch_login() returns json
language plpgsql security definer set search_path = '' as $$
declare u public.fd_allowed_users; e text := public.fd_jwt_email();
begin
  select * into u from public.fd_allowed_users where email = e;
  if not found or coalesce(auth.jwt()->>'role','') <> 'authenticated' then
    return json_build_object('role', null);
  end if;
  if not u.legacy then
    update public.fd_allowed_users set last_login_at = coalesce(last_login_at, now()) where email = e;
  end if;
  return json_build_object('role', u.role, 'kid_id', u.kid_id, 'legacy', u.legacy, 'email', e);
end $$;

-- ===== פעולות הורה =====
create or replace function public.fd_require_parent() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.fd_is_parent() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end $$;

create or replace function public.fd_audit(p_intent text, p_entity text, p_action text, p_prev jsonb, p_new jsonb) returns void
language sql security definer set search_path = '' as
$$ insert into public.audit_log(intent, entity, action, previous_value, new_value, verification_result, source)
   values (p_intent, p_entity, p_action, p_prev, p_new, 'ok', 'app:' || public.fd_jwt_email()) $$;

create or replace function public.fd_device_approve(p_id uuid, p_name text) returns json
language plpgsql security definer set search_path = '' as $$
declare d public.fd_devices; n int; nm text := nullif(btrim(left(coalesce(p_name,''), 40)), '');
begin
  perform public.fd_require_parent();
  perform pg_advisory_xact_lock(hashtext('fd_device_request'));
  select * into d from public.fd_devices where id = p_id for update;
  if not found or d.status <> 'pending' or d.expires_at <= now() then
    return json_build_object('ok', false, 'reason', 'expired');
  end if;
  select count(*) into n from public.fd_devices where status = 'approved';
  if n >= 20 then
    return json_build_object('ok', false, 'reason', 'full');
  end if;
  update public.fd_devices
    set status = 'approved', name = coalesce(nm, 'מכשיר'), approved_at = now(),
        approved_by = public.fd_jwt_email(), pair_code = null, expires_at = null, last_seen = now()
    where id = p_id;
  perform public.fd_audit('approve device', 'fd_devices', 'approve', null,
                          jsonb_build_object('id', p_id, 'name', coalesce(nm, 'מכשיר')));
  return json_build_object('ok', true);
end $$;

create or replace function public.fd_device_reject(p_id uuid) returns json
language plpgsql security definer set search_path = '' as $$
begin
  perform public.fd_require_parent();
  update public.fd_devices set status = 'rejected', pair_code = null where id = p_id and status = 'pending';
  if not found then return json_build_object('ok', false, 'reason', 'expired'); end if;
  perform public.fd_audit('reject device request', 'fd_devices', 'reject', null, jsonb_build_object('id', p_id));
  return json_build_object('ok', true);
end $$;

create or replace function public.fd_device_revoke(p_id uuid) returns json
language plpgsql security definer set search_path = '' as $$
declare nm text;
begin
  perform public.fd_require_parent();
  update public.fd_devices set status = 'revoked' where id = p_id and status = 'approved' returning name into nm;
  if not found then return json_build_object('ok', false, 'reason', 'not_found'); end if;
  perform public.fd_audit('revoke device', 'fd_devices', 'revoke', jsonb_build_object('id', p_id, 'name', nm), null);
  return json_build_object('ok', true);
end $$;

create or replace function public.fd_device_rename(p_id uuid, p_name text) returns json
language plpgsql security definer set search_path = '' as $$
declare nm text := nullif(btrim(left(coalesce(p_name,''), 40)), ''); old text;
begin
  perform public.fd_require_parent();
  if nm is null then return json_build_object('ok', false, 'reason', 'empty'); end if;
  select name into old from public.fd_devices where id = p_id and status = 'approved';
  if not found then return json_build_object('ok', false, 'reason', 'not_found'); end if;
  update public.fd_devices set name = nm where id = p_id;
  perform public.fd_audit('rename device', 'fd_devices', 'update', jsonb_build_object('name', old), jsonb_build_object('name', nm));
  return json_build_object('ok', true);
end $$;

create or replace function public.fd_user_add(p_email text, p_role text, p_kid int default null) returns json
language plpgsql security definer set search_path = '' as $$
declare e text := lower(btrim(coalesce(p_email,'')));
begin
  perform public.fd_require_parent();
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return json_build_object('ok', false, 'reason', 'email'); end if;
  if p_role is null or p_role not in ('parent','kid') then return json_build_object('ok', false, 'reason', 'role'); end if;
  if p_role = 'kid' and (p_kid is null or not exists(select 1 from public.kids where id = p_kid)) then
    return json_build_object('ok', false, 'reason', 'kid');
  end if;
  if exists(select 1 from public.fd_allowed_users where email = e) then
    return json_build_object('ok', false, 'reason', 'exists');
  end if;
  insert into public.fd_allowed_users(email, role, kid_id, created_by)
    values (e, p_role, case when p_role = 'kid' then p_kid end, public.fd_jwt_email());
  perform public.fd_audit('add allowed email', 'fd_allowed_users', 'insert', null,
                          jsonb_build_object('email', e, 'role', p_role, 'kid_id', p_kid));
  return json_build_object('ok', true);
end $$;

create or replace function public.fd_user_remove(p_email text) returns json
language plpgsql security definer set search_path = '' as $$
declare e text := lower(btrim(coalesce(p_email,''))); u public.fd_allowed_users;
begin
  perform public.fd_require_parent();
  if e = public.fd_jwt_email() then return json_build_object('ok', false, 'reason', 'self'); end if;
  select * into u from public.fd_allowed_users where email = e;
  if not found then return json_build_object('ok', false, 'reason', 'not_found'); end if;
  if u.legacy then return json_build_object('ok', false, 'reason', 'legacy'); end if;
  if u.role = 'parent' and (select count(*) from public.fd_allowed_users where role = 'parent' and not legacy) <= 1 then
    return json_build_object('ok', false, 'reason', 'last_parent');
  end if;
  delete from public.fd_allowed_users where email = e;
  perform public.fd_audit('remove allowed email', 'fd_allowed_users', 'delete',
                          jsonb_build_object('email', e, 'role', u.role, 'kid_id', u.kid_id), null);
  return json_build_object('ok', true);
end $$;

-- ===== שלב ב' (מופעל רק ע"י Claude אחרי "הכול מאושר") =====
create or replace function public.fd_access_finalize() returns json
language plpgsql security definer set search_path = '' as $$
declare missing text;
begin
  select string_agg(email, ', ') into missing from public.fd_allowed_users
    where role = 'parent' and not legacy and last_login_at is null;
  if missing is not null then
    raise exception 'not all parents signed in with the new method: %', missing;
  end if;
  update public.fd_access_config set locked = true, legacy_password = false, updated_at = now() where id = 1;
  delete from public.fd_allowed_users where legacy;
  insert into public.audit_log(intent, entity, action, new_value, verification_result, source)
    values ('access stage B: lock reads, retire shared password', 'fd_access_config', 'update',
            '{"locked":true,"legacy_password":false}', 'ok', 'claude');
  return json_build_object('ok', true);
end $$;

-- ===== חסימת הרשמה של זרים (Auth Hook: Before User Created) =====
-- יצירת משתמש רק למייל שברשימה (או חבר בפרויקט קומה שניה). אחרת — לא נוצר משתמש ולא נשלח מייל.
create or replace function public.fd_hook_before_user_created(event jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare e text := lower(coalesce(event->'user'->>'email', ''));
begin
  if e <> '' and (exists(select 1 from public.fd_allowed_users where email = e)
                  or exists(select 1 from public.sf_members where lower(email) = e)) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'signup not allowed'));
end $$;

-- ===== מי רשאי להריץ מה =====
revoke all on function public.fd_hook_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.fd_hook_before_user_created(jsonb) to supabase_auth_admin;
revoke all on function public.fd_access_finalize() from public, anon, authenticated;
revoke all on function public.fd_audit(text,text,text,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.fd_require_parent() from public, anon;
revoke all on function public.fd_device_approve(uuid,text) from public, anon;
revoke all on function public.fd_device_reject(uuid) from public, anon;
revoke all on function public.fd_device_revoke(uuid) from public, anon;
revoke all on function public.fd_device_rename(uuid,text) from public, anon;
revoke all on function public.fd_user_add(text,text,int) from public, anon;
revoke all on function public.fd_user_remove(text) from public, anon;
revoke all on function public.fd_touch_login() from public, anon;
grant execute on function public.fd_device_approve(uuid,text), public.fd_device_reject(uuid),
  public.fd_device_revoke(uuid), public.fd_device_rename(uuid,text), public.fd_user_add(text,text,int),
  public.fd_user_remove(text), public.fd_touch_login(), public.fd_require_parent() to authenticated;
grant execute on function public.fd_device_request(text,text), public.fd_access_info(),
  public.fd_can_read(), public.fd_role(), public.fd_is_parent(), public.fd_device_ok(),
  public.fd_hash(text), public.fd_jwt_email() to anon, authenticated;
