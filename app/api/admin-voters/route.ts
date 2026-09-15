import { adminSupabase, isAdminRequest } from '@/lib/supabase';

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const row = {
    credential: String(body.credential || '').trim(),
    role: body.role || 'Murid',
    level: body.level || 'Kelas 10',
    class_name: body.class_name || null,
    full_name: body.full_name || '',
    gender: body.gender || null,
  };
  if (!row.credential || !row.full_name) return Response.json({ error: 'NISN/NIP dan nama wajib diisi.' }, { status: 400 });
  const { data, error } = await adminSupabase().from('voters').upsert(row, { onConflict: 'credential' }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ voter: data });
}
