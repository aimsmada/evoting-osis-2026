import { adminSupabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { credential, candidate_id } = await req.json();
    const supabase = adminSupabase();
    const { data, error } = await supabase.rpc('cast_vote', { p_credential: String(credential || '').trim(), p_candidate_id: candidate_id });
    if (error) throw error;
    return Response.json(data, { status: data?.ok ? 200 : 400 });
  } catch (error: any) {
    return Response.json({ ok: false, message: error.message || 'Voting gagal.' }, { status: 500 });
  }
}
