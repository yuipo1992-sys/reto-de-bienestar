export type Field = { key: string; label: string; multiline?: boolean };
export type Challenge = { id: string; day_number: number; day_name: string; title: string; subtitle: string; description: string; wellness_message: string; instructions: string; unlocked: boolean; unlocked_at: string | null; unlocked_by: string | null; order_number: number; scheduled_date: string | null; form_fields: Field[] };
export type Participant = { id: string; full_name: string; identification: string; created_at: string; last_login: string; active: boolean };
export type Response = { id: string; participant_id: string; challenge_id: string; response_data: Record<string,string>; completed_at: string; challenge_snapshot: {title: string; instructions: string; fields: Field[]} };
export type BingoItem = { id: string; challenge_id: string; description: string; order_number: number; active: boolean };
export type UnlockEvent = { id: string; challenge_id: string; admin_id: string; unlocked: boolean; occurred_at: string };
