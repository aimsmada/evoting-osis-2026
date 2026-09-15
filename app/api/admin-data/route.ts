import { adminSupabase, isAdminRequest } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  if (!isAdminRequest(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = adminSupabase();
  const [voters, candidates, votes, settings] = await Promise.all([
    supabase.from('voters').select('*').order('level').order('class_name').order('full_name').limit(1500),
    supabase.from('candidates').select('*').order('pair_number'),
    supabase.from('votes').select('*, voters(full_name, credential, level, class_name), candidates(pair_number, chair_name, vice_name)').order('created_at', { ascending: false }).limit(1500),
    supabase.from('site_settings').select('*'),
  ]);
  for (const res of [voters, candidates, votes, settings]) if (res.error) return Response.json({ error: res.error.message }, { status: 500 });
  return Response.json({ voters: voters.data, candidates: candidates.data, votes: votes.data, settings: settings.data });
}
