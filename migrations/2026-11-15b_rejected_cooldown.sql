-- תיקון (15.11.2026 ערב): מכשיר שנדחה לא מבקש קוד חדש במשך שעה.
-- חזרה לאחור: להריץ שוב את הגרסה הקודמת של הפונקציה מ-2026-11-15_access_control.sql (git, commit 00940c5).

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
  -- נדחה ע"י הורה: לא מבקשים שוב שעה שלמה (כדי שהבקשה לא תקפוץ שוב ושוב)
  if found and d.status = 'rejected' and d.created_at > now() - interval '1 hour' then
    return json_build_object('status','rejected','locked',lk);
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

-- בדיקת מצב מכשיר בלי ליצור בקשה (משמש בשניות הראשונות אחרי פתיחת הלוח)
create or replace function public.fd_device_status(p_token text) returns json
language plpgsql stable security definer set search_path = '' as $$
declare d public.fd_devices;
  lk boolean := coalesce((select x.locked from public.fd_access_config x where x.id = 1), true);
begin
  if p_token is null or length(p_token) < 32 or length(p_token) > 128 then
    return json_build_object('status','waiting','locked',lk);
  end if;
  select * into d from public.fd_devices where token_hash = public.fd_hash(p_token);
  if found and d.status = 'approved' then return json_build_object('status','approved','locked',lk,'name',d.name); end if;
  if found and d.status = 'rejected' and d.created_at > now() - interval '1 hour' then return json_build_object('status','rejected','locked',lk); end if;
  if found and d.status = 'pending' and d.expires_at > now() then
    return json_build_object('status','pending','code',d.pair_code,'expires_at',d.expires_at,'locked',lk);
  end if;
  return json_build_object('status','waiting','locked',lk);
end $$;
revoke all on function public.fd_device_status(text) from public;
grant execute on function public.fd_device_status(text) to anon, authenticated;
