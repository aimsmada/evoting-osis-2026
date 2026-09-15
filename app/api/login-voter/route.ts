import { adminSupabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { credential } = await req.json();
    const cleaned = String(credential || '').trim();
    if (!cleaned) return Response.json({ error: 'Masukkan NISN/NIP.' }, { status: 400 });
    const supabase = adminSupabase();
    const { data, error } = await supabase.from('voters').select('id,credential,role,level,class_name,full_name,gender,has_voted,voted_at').eq('credential', cleaned).maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: 'NISN/NIP tidak terdaftar.' }, { status: 404 });
    return Response.json({ voter: data });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Login gagal.' }, { status: 500 });
  }
}
