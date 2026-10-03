create or replace function public.validate_response() returns trigger language plpgsql security definer set search_path = '' as $$
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
   if jsonb_typeof(new.response_data->k) is distinct from 'string' or length(trim(v)) not between 1 and 1000 or regexp_replace(v,'[[:space:]]','','g')='' then raise exception 'missing_fields'; end if;
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
