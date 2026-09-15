import { adminSupabase, isAdminRequest } from '@/lib/supabase';

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const entries = [
    { key: 'running_text', value: body.running_text || '' },
    { key: 'theme', value: body.theme || { primary: '#2563eb', accent: '#334155', muted: '#64748b' } },
  ];
  const { data, error } = await adminSupabase().from('site_settings').upsert(entries).select();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ settings: data });
}
