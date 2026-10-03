import type { Field } from './types';
export const normalizeName=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function validateAnswers(fields:Field[],answers:Record<string,string>,bingo:boolean) {
 if(fields.some(f=>!answers[f.key]?.trim())) return 'Completá todos los campos antes de guardar.';
 if(fields.some(f=>answers[f.key].length>1000)) return 'Cada respuesta puede tener hasta 1000 caracteres.';
 if(bingo) {
  const names=fields.map(f=>normalizeName(answers[f.key]));
  if(names.some(n=>n.length<2)) return 'Escribí el nombre completo de cada compañero.';
  if(new Set(names).size!==names.length) return 'Usá un compañero diferente en cada casilla del bingo.';
 }
 return '';
}
export function csv(rows:unknown[][]) {
 return '\uFEFF'+rows.map(row=>row.map(value=>{
  let cell=String(value??'');
  if(/^[\s\u0000-\u001f]*[=+@-]/.test(cell)) cell="'"+cell;
  return '"'+cell.replace(/"/g,'""')+'"';
 }).join(',')).join('\r\n');
}
export function downloadCsv(name:string,rows:unknown[][]) {
 const url=URL.createObjectURL(new Blob([csv(rows)],{type:'text/csv;charset=utf-8;'}));
 const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function formatDate(value:string|null) { return value ? new Intl.DateTimeFormat('es-CR',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Costa_Rica'}).format(new Date(value)) : '—'; }
export function friendlyError(error:unknown) {
 const e=error as {message?:string;code?:string};
 if(e.code==='23505') return 'Este reto ya está completado. Actualizá para ver tu respuesta.';
 if(e.message?.includes('challenge_locked')) return 'Este reto está bloqueado. Esperá a que se habilite.';
 if(e.message?.includes('duplicate_bingo')) return 'Usá un compañero diferente en cada casilla.';
 if(e.message?.includes('different_areas')) return 'Elegí compañeros de dos áreas distintas.';
 if(e.message?.includes('missing_fields')||e.message?.includes('invalid_fields')) return 'Revisá que todos los campos estén completos.';
 if(e.code==='PGRST301'||e.code==='42501'||e.message?.includes('JWT')||e.message?.includes('unauthorized')) return 'Tu sesión expiró o no tiene acceso. Volvé a ingresar.';
 return 'No pudimos completar la operación. Revisá tu conexión e intentá nuevamente.';
}
