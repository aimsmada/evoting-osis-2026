import { adminSupabase, isAdminRequest } from '@/lib/supabase';

function normalizeMission(input: unknown) {
  if (Array.isArray(input)) return input.map(String).map((x) => x.trim()).filter(Boolean);
  if (typeof input === 'string') return input.split('\n').map((x) => x.trim()).filter(Boolean);
  return [];
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const pairPhoto = body.pair_photo_url || body.chair_photo_url || null;
  const { data, error } = await adminSupabase().from('candidates').upsert({
    id: body.id || undefined,
    pair_number: Number(body.pair_number),
    chair_name: body.chair_name,
    vice_name: body.vice_name,
    pair_photo_url: pairPhoto,
    chair_photo_url: pairPhoto,
    vice_photo_url: null,
    vision: body.vision || '',
    mission: normalizeMission(body.mission),
    slogan: body.slogan || '',
    is_active: body.is_active ?? true,
  }, { onConflict: 'pair_number' }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ candidate: data });
}
