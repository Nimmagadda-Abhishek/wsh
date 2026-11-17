import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

const opts = { auth: { autoRefreshToken: false, persistSession: false } };

// Service-role client: bypasses RLS. Server-side only. Authorization is enforced in route code.
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceKey, opts);

// Fresh anon client per call so auth sessions never leak between requests.
export const makeAnonClient = () => createClient(env.supabaseUrl, env.supabaseAnonKey, opts);
