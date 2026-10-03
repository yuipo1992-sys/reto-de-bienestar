-- Run once, then policies.sql and seed.sql, in Supabase SQL Editor.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

create table public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
create table public.participants (
 id uuid primary key default gen_random_uuid(), full_name text not null check(length(trim(full_name)) between 3 and 120),
 identification text not null unique check(identification ~ '^[0-9]{9,12}$'),
 created_at timestamptz not null default now(), last_login timestamptz not null default now(), active boolean not null default true
);
create table public.participant_devices (
 user_id uuid primary key references auth.users(id) on delete cascade,
 participant_id uuid not null references public.participants(id) on delete cascade
);
create index on public.participant_devices(participant_id);
create table public.participant_secrets (
 participant_id uuid primary key references public.participants(id) on delete cascade, recovery_hash text not null
);
create table public.challenges (
 id uuid primary key default gen_random_uuid(), day_number integer not null unique check(day_number between 1 and 5),
 day_name text not null, title text not null check(length(trim(title)) between 1 and 160), subtitle text not null default '',
 description text not null default '', wellness_message text not null default '', instructions text not null,
 unlocked boolean not null default false, unlocked_at timestamptz, unlocked_by uuid references auth.users(id),
 order_number integer not null unique, scheduled_date date,
 status text generated always as (case when unlocked then 'Disponible' else 'Bloqueado' end) stored,
 form_fields jsonb not null default '[]'::jsonb check(jsonb_typeof(form_fields) = 'array')
);
create table public.bingo_items (
 id uuid primary key default gen_random_uuid(), challenge_id uuid not null references public.challenges(id) on delete cascade,
 description text not null check(length(trim(description)) between 1 and 240), order_number integer not null check(order_number between 1 and 9),
 active boolean not null default true, unique(challenge_id, order_number)
);
create table public.challenge_responses (
 id uuid primary key default gen_random_uuid(), participant_id uuid not null references public.participants(id),
 challenge_id uuid not null references public.challenges(id), response_data jsonb not null,
 challenge_snapshot jsonb not null default '{}'::jsonb,
 completed boolean not null default true check(completed), completed_at timestamptz not null default now(),
 created_at timestamptz not null default now(), unique(participant_id,challenge_id)
);
create index on public.challenge_responses(challenge_id);
create index on public.participants(last_login);
create table public.unlock_events (
 id uuid primary key default gen_random_uuid(), challenge_id uuid not null references public.challenges(id),
 admin_id uuid not null references auth.users(id), unlocked boolean not null, occurred_at timestamptz not null default now()
);
create table public.enrollment_limits (user_id uuid primary key references auth.users(id) on delete cascade, attempts integer not null default 0, window_start timestamptz not null default now());

create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.admins where user_id = auth.uid());
$$;
create function public.own_participant() returns uuid language sql stable security definer set search_path = '' as $$
 select d.participant_id from public.participant_devices d join public.participants p on p.id=d.participant_id where d.user_id=auth.uid() and p.active;
$$;

-- Returns generic recovery_required rather than disclosing participant details.
create function public.enroll(p_name text, p_identification text, p_recovery text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pid uuid; existing_hash text; normalized text; linked uuid; n integer; was_created boolean := false;
begin
 if auth.uid() is null or public.is_admin() then raise exception 'unauthorized'; end if;
 normalized := regexp_replace(p_identification, '[^0-9]', '', 'g');
 if normalized !~ '^[0-9]{9,12}$' or length(trim(p_name)) not between 3 and 120 or length(p_recovery)>100 then raise exception 'invalid_input'; end if;
 insert into public.enrollment_limits(user_id,attempts) values(auth.uid(),1)
 on conflict(user_id) do update set attempts=case when public.enrollment_limits.window_start<now()-interval '15 minutes' then 1 else public.enrollment_limits.attempts+1 end,
 window_start=case when public.enrollment_limits.window_start<now()-interval '15 minutes' then now() else public.enrollment_limits.window_start end
 returning attempts into n;
 if n>10 then return jsonb_build_object('status','rate_limited'); end if;
 -- Serialize registrations of the same normalized ID.
 perform pg_advisory_xact_lock(hashtextextended(normalized,0));
 select participant_id into linked from public.participant_devices where user_id=auth.uid();
 select id into pid from public.participants where identification=normalized;
 if pid is not null and linked=pid then
   if not exists(select 1 from public.participants where id=pid and active) then return jsonb_build_object('status','recovery_required'); end if;
 elsif linked is not null then
   return jsonb_build_object('status','sign_out_required');
 elsif pid is not null then
   select recovery_hash into existing_hash from public.participant_secrets where participant_id=pid;
   if p_recovery is null or extensions.crypt(p_recovery,existing_hash) is distinct from existing_hash
      or not exists(select 1 from public.participants where id=pid and active) then
     return jsonb_build_object('status','recovery_required');
   end if;
   insert into public.participant_devices(user_id,participant_id) values(auth.uid(),pid);
 else
   if p_recovery is null or p_recovery !~ '^[a-f0-9]{32}$' then raise exception 'invalid_recovery'; end if;
   insert into public.participants(full_name,identification) values(trim(p_name),normalized) returning id into pid;
   insert into public.participant_secrets values(pid,extensions.crypt(p_recovery,extensions.gen_salt('bf',10)));
   insert into public.participant_devices values(auth.uid(),pid);
   was_created := true;
 end if;
 update public.participants set last_login=now() where id=pid;
 return jsonb_build_object('status','ok','created',was_created,'participant_id',pid);
end; $$;

create function public.touch_login() returns void language sql security definer set search_path = '' as $$
 update public.participants set last_login=now() where id=public.own_participant();
$$;

create function public.validate_response() returns trigger language plpgsql security definer set search_path = '' as $$
declare c public.challenges; field jsonb; k text; v text; expected integer; names text[] := '{}'; normalized text; snap jsonb;
begin
 if new.participant_id is distinct from public.own_participant() then raise exception 'unauthorized'; end if;
 select * into c from public.challenges where id=new.challenge_id for update;
 if c.id is null or not c.unlocked then raise exception 'challenge_locked'; end if;
 if jsonb_typeof(new.response_data) is distinct from 'object' or octet_length(new.response_data::text)>20000 then raise exception 'invalid_response'; end if;
 if c.day_number=5 then
   select count(*),jsonb_agg(jsonb_build_object('key',id::text,'label',description) order by order_number)
     into expected,snap from public.bingo_items where challenge_id=c.id and active;
   if expected<>9 then raise exception 'invalid_bingo_configuration'; end if;
 else
   snap:=c.form_fields; expected:=jsonb_array_length(snap);
 end if;
 if (select count(*) from jsonb_object_keys(new.response_data))<>expected then raise exception 'invalid_fields'; end if;
 for field in select * from jsonb_array_elements(snap) loop
   k:=field->>'key'; v:=new.response_data->>k;
   if jsonb_typeof(new.response_data->k) is distinct from 'string' or length(trim(v)) not between 1 and 1000 then raise exception 'missing_fields'; end if;
   if c.day_number=5 then
     normalized:=regexp_replace(lower(extensions.unaccent(trim(v))),'[^a-z0-9]','','g');
     if length(normalized)<2 or normalized=any(names) then raise exception 'duplicate_bingo'; end if;
     names:=array_append(names,normalized);
   end if;
 end loop;
 if c.day_number=4 and lower(trim(new.response_data->>'area1'))=lower(trim(new.response_data->>'area2')) then raise exception 'different_areas_required'; end if;
 new.completed:=true; new.completed_at:=now(); new.created_at:=now();
 new.challenge_snapshot:=jsonb_build_object('title',c.title,'instructions',c.instructions,'fields',snap);
 return new;
end; $$;
create trigger validate_response before insert on public.challenge_responses for each row execute function public.validate_response();

create function public.audit_unlock() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.unlocked is distinct from old.unlocked then
   if not public.is_admin() then raise exception 'unauthorized'; end if;
   new.unlocked_at:=case when new.unlocked then now() else old.unlocked_at end;
   new.unlocked_by:=case when new.unlocked then auth.uid() else old.unlocked_by end;
   insert into public.unlock_events(challenge_id,admin_id,unlocked) values(new.id,auth.uid(),new.unlocked);
 end if;
 return new;
end; $$;
create trigger audit_unlock before update on public.challenges for each row execute function public.audit_unlock();

-- Edit bingo atomically and lock its challenge against concurrent submissions.
create function public.edit_challenge(p_id uuid,p_title text,p_description text,p_message text,p_instructions text,p_bingo jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare d integer; item jsonb;
begin
 if not public.is_admin() then raise exception 'unauthorized'; end if;
 select day_number into d from public.challenges where id=p_id for update;
 if d is null or length(trim(p_title)) not between 1 and 160 or length(trim(p_instructions)) not between 1 and 4000
    or length(p_description)>4000 or length(p_message)>1000 then raise exception 'invalid_input'; end if;
 update public.challenges set title=trim(p_title),description=p_description,wellness_message=p_message,instructions=p_instructions where id=p_id;
 if d=5 then
   if jsonb_typeof(p_bingo) is distinct from 'array' or jsonb_array_length(p_bingo)<>9 then raise exception 'invalid_bingo'; end if;
   if (select count(distinct x->>'id') from jsonb_array_elements(p_bingo) x)<>9 then raise exception 'invalid_bingo'; end if;
   for item in select * from jsonb_array_elements(p_bingo) loop
     update public.bingo_items set description=item->>'description' where id=(item->>'id')::uuid and challenge_id=p_id;
     if not found then raise exception 'invalid_bingo'; end if;
   end loop;
 end if;
end; $$;
