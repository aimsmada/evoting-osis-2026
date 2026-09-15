import { adminSupabase, isAdminRequest } from '@/lib/supabase';

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { credential, invalidate_only, note } = await req.json();
  const supabase = adminSupabase();
  const { data: voter, error: voterErr } = await supabase.from('voters').select('id').eq('credential', String(credential || '').trim()).maybeSingle();
  if (voterErr) return Response.json({ error: voterErr.message }, { status: 500 });
  if (!voter) return Response.json({ error: 'Pemilih tidak ditemukan.' }, { status: 404 });
  const { error: voteErr } = await supabase.from('votes').update({ valid: false, invalidated_at: new Date().toISOString(), admin_note: note || 'Direset admin' }).eq('voter_id', voter.id);
  if (voteErr) return Response.json({ error: voteErr.message }, { status: 500 });
  if (!invalidate_only) {
    const { error: resetErr } = await supabase.from('voters').update({ has_voted: false, voted_candidate_id: null, voted_at: null }).eq('id', voter.id);
    if (resetErr) return Response.json({ error: resetErr.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
