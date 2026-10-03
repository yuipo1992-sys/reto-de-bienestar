import { createClient, type SupabaseClient } from '@supabase/supabase-js';
let client: SupabaseClient | undefined;
export function configured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY); }
export function db() {
  if (!configured()) throw new Error('configuration_missing');
  return client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
}
export async function allRows<T>(table: string): Promise<T[]> {
  const rows:T[]=[];
  for(let start=0;;start+=500) {
    const {data,error}=await db().from(table).select('*').order('id').range(start,start+499);
    if(error) throw error;
    rows.push(...data as T[]);
    if(data.length<500) return rows;
  }
}
