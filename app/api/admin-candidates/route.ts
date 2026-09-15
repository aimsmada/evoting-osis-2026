import { adminSupabase, isAdminRequest } from '@/lib/supabase';

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { data, error } = await adminSupabase().from('candidates').upsert({
    id: body.id || undefined,
    pair_number: Number(body.pair_number),
    chair_name: body.chair_name,
    vice_name: body.vice_name,
    chair_photo_url: body.chair_photo_url || null,
    vice_photo_url: body.vice_photo_url || null,
    slogan: body.slogan || '',
    is_active: body.is_active ?? true,
  }, { onConflict: 'pair_number' }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ candidate: data });
}
