alter table public.admins enable row level security;
alter table public.participants enable row level security;
alter table public.participant_devices enable row level security;
alter table public.participant_secrets enable row level security;
alter table public.challenges enable row level security;
alter table public.bingo_items enable row level security;
alter table public.challenge_responses enable row level security;
alter table public.unlock_events enable row level security;
alter table public.enrollment_limits enable row level security;

revoke all on all tables in schema public from anon,authenticated;
grant select on public.admins,public.participants,public.participant_devices,public.challenges,public.bingo_items,public.challenge_responses,public.unlock_events to authenticated;
grant insert(participant_id,challenge_id,response_data) on public.challenge_responses to authenticated;
grant update(unlocked) on public.challenges to authenticated;
grant update(active) on public.participants to authenticated;

create policy admin_self on public.admins for select to authenticated using(user_id=auth.uid());
create policy participants_read on public.participants for select to authenticated using(id=public.own_participant() or public.is_admin());
create policy participants_admin on public.participants for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy devices_read on public.participant_devices for select to authenticated using(user_id=auth.uid());
create policy challenges_read on public.challenges for select to authenticated using(public.own_participant() is not null or public.is_admin());
create policy challenges_update on public.challenges for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy bingo_read on public.bingo_items for select to authenticated using(public.is_admin() or (public.own_participant() is not null and exists(select 1 from public.challenges c where c.id=challenge_id and c.unlocked)));
create policy responses_read on public.challenge_responses for select to authenticated using(participant_id=public.own_participant() or public.is_admin());
create policy responses_insert on public.challenge_responses for insert to authenticated with check(participant_id=public.own_participant());
create policy audit_read on public.unlock_events for select to authenticated using(public.is_admin());

revoke all on function public.is_admin(),public.own_participant(),public.enroll(text,text,text),public.touch_login(),public.validate_response(),public.audit_unlock(),public.edit_challenge(uuid,text,text,text,text,jsonb) from public,anon;
grant execute on function public.is_admin(),public.own_participant(),public.enroll(text,text,text),public.touch_login(),public.edit_challenge(uuid,text,text,text,text,jsonb) to authenticated;
