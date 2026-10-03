import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {unaccent} from '@electric-sql/pglite/contrib/unaccent';

test('SQL integration: enrollment, RLS, locked challenges, bingo, audit and immutable history',async(t)=>{
 const pg=new PGlite({extensions:{pgcrypto,unaccent}});
 const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',admin='00000000-0000-4000-8000-000000000003',device='00000000-0000-4000-8000-000000000004';
 try {
  await pg.exec(`create role anon;create role authenticated;create schema auth;create schema extensions;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,extensions to authenticated;grant execute on function auth.uid() to authenticated;insert into auth.users values('${a}'),('${b}'),('${admin}'),('${device}');`);
  for(const file of ['schema.sql','policies.sql','seed.sql'])await pg.exec(await readFile(new URL('../supabase/'+file,import.meta.url),'utf8'));
  await pg.query('insert into public.admins values($1)',[admin]);
  async function as(user:string){await pg.exec('reset role');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await pg.exec('set role authenticated');}
  async function enroll(name:string,id:string,key:string){return (await pg.query<{result:{status:string;created:boolean;participant_id:string}}>('select public.enroll($1,$2,$3) as result',[name,id,key])).rows[0].result;}
  await as(a);const pa=await enroll('Ana Prueba','1-1111-1111','a'.repeat(32));assert.equal(pa.status,'ok');assert.equal(pa.created,true);
  await as(b);const recovery=await enroll('Otra Persona','111111111','b'.repeat(32));assert.equal(recovery.status,'recovery_required');
  const pb=await enroll('Luis Prueba','2-2222-2222','b'.repeat(32));assert.equal(pb.status,'ok');
  await t.test('participant can read only self and cannot grant admin, unlock or access secrets',async()=>{
   assert.equal((await pg.query('select * from participants')).rows.length,1);
   assert.equal((await pg.query('select * from participants where id=$1',[pa.participant_id])).rows.length,0);
   await assert.rejects(pg.query('select * from participant_secrets'),/permission denied/);
   await assert.rejects(pg.query('insert into admins values($1)',[b]),/permission denied/);
   const denied=await pg.query('update challenges set unlocked=true returning id');assert.equal(denied.rows.length,0);
  });
  const challenges=(await pg.query<{id:string;day_number:number;form_fields:{key:string}[]}>('select * from challenges order by day_number')).rows;
  const response=Object.fromEntries(challenges[0].form_fields.map((f,i)=>[f.key,`Respuesta ${i}`]));
  const submit=(participant:string,cid:string,data:Record<string,unknown>)=>pg.query('insert into challenge_responses(participant_id,challenge_id,response_data) values($1,$2,$3)',[participant,cid,JSON.stringify(data)]);
  await t.test('locked challenges and cross-participant writes rejected in database',async()=>{
   await assert.rejects(submit(pb.participant_id,challenges[0].id,response),/challenge_locked/);
   await assert.rejects(submit(pa.participant_id,challenges[0].id,response),/unauthorized/);
  });
  await as(admin);await pg.query('update challenges set unlocked=true where day_number in (1,5)');
  await t.test('admin can see participants and unlock actions are attributed',async()=>{
   assert.equal((await pg.query('select * from participants')).rows.length,2);
   const log=(await pg.query<{admin_id:string}>('select * from unlock_events')).rows;assert.equal(log.length,2);assert.ok(log.every(e=>e.admin_id===admin));
  });
  await as(b);
  await t.test('empty fields, unexpected keys, duplicate submissions and edits denied',async()=>{
   await assert.rejects(submit(pb.participant_id,challenges[0].id,{...response,pet1:' '}),/missing_fields/);
   await assert.rejects(submit(pb.participant_id,challenges[0].id,{...response,extra:'x'}),/invalid_fields/);
   await submit(pb.participant_id,challenges[0].id,response);
   await assert.rejects(submit(pb.participant_id,challenges[0].id,response),/duplicate key/);
   await assert.rejects(pg.query("update challenge_responses set response_data='{}'"),/permission denied/);
  });
  const items=(await pg.query<{id:string}>('select * from bingo_items order by order_number')).rows;
  await t.test('bingo requires nine distinct normalized names',async()=>{
   const answers=Object.fromEntries(items.map((i,n)=>[i.id,`Compañero ${n}`]));
   await assert.rejects(submit(pb.participant_id,challenges[4].id,{[items[0].id]:'Ana'}),/invalid_fields/);
   await assert.rejects(submit(pb.participant_id,challenges[4].id,{...answers,[items[0].id]:'José Pérez',[items[1].id]:'JOSE-PEREZ'}),/duplicate_bingo/);
   await submit(pb.participant_id,challenges[4].id,answers);
  });
  await as(device);
  await t.test('recovery attaches another device without duplicate participant',async()=>{
   const restored=await enroll('Ana Prueba','111111111','a'.repeat(32));assert.equal(restored.participant_id,pa.participant_id);assert.equal(restored.created,false);
   assert.equal((await pg.query('select * from participants')).rows.length,1);
  });
  await as(admin);
  await t.test('edited challenge preserves submitted snapshot and inactive users lose access',async()=>{
   await pg.query("select edit_challenge($1,'Título nuevo','Descripción','Mensaje','Instrucciones','[]')",[challenges[0].id]);
   const saved=(await pg.query<{challenge_snapshot:{title:string}}>('select challenge_snapshot from challenge_responses where challenge_id=$1',[challenges[0].id])).rows[0];assert.equal(saved.challenge_snapshot.title,'Conocernos un poco más');
   await pg.query('update participants set active=false where id=$1',[pb.participant_id]);await as(b);
   assert.equal((await pg.query('select * from participants')).rows.length,0);assert.equal((await pg.query('select * from challenge_responses')).rows.length,0);
  });
  await pg.exec('reset role;set role anon');
  await t.test('unauthenticated reads and enrollment denied',async()=>{
   await assert.rejects(pg.query('select * from participants'),/permission denied/);
   await assert.rejects(pg.query("select enroll('Ana','111111111','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')"),/permission denied/);
  });
 }finally{await pg.close();}
});
