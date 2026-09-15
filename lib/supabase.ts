import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const browserSupabase = () => createClient(supabaseUrl, publishableKey);

export const adminSupabase = () => {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server env variables belum lengkap.');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

export function isAdminRequest(req: Request) {
  const password = req.headers.get('x-admin-password') || '';
  return Boolean(process.env.ADMIN_PASSWORD) && password === process.env.ADMIN_PASSWORD;
}
