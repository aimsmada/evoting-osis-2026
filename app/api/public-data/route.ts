import { adminSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = adminSupabase();
    const [candidatesRes, turnoutRes, settingRes] = await Promise.all([
      supabase.from('vote_results').select('*').order('pair_number'),
      supabase.from('turnout_by_level').select('*'),
      supabase.from('site_settings').select('key,value').in('key', ['running_text', 'theme']),
    ]);
    if (candidatesRes.error) throw candidatesRes.error;
    if (turnoutRes.error) throw turnoutRes.error;
    if (settingRes.error) throw settingRes.error;
    const settings = Object.fromEntries((settingRes.data || []).map((x: any) => [x.key, x.value]));
    return Response.json({ candidates: candidatesRes.data || [], turnout: turnoutRes.data || [], settings, now: new Date().toISOString() });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Gagal mengambil data.' }, { status: 500 });
  }
}
