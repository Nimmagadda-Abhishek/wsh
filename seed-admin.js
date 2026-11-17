import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(scriptDirectory, '../.env');
dotenv.config({ path: envPath });

const requestedEmail = process.argv[2]?.trim().toLowerCase();

if (!requestedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail)) {
  console.error('Usage: npm run seed:admin -- admin@example.com');
  console.error('Or, from the scripts folder: node seed-admin.js admin@example.com');
  process.exit(1);
}

const { supabaseAdmin } = await import('../src/config/supabase.js');

async function findAuthUserByEmail(email) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
  throw new Error('Stopped after scanning 100,000 accounts. Contact support to locate this account.');
}

try {
  const user = await findAuthUserByEmail(requestedEmail);
  if (!user) throw new Error(`No Supabase Auth account found for ${requestedEmail}. Create the account first.`);
  if (!user.email_confirmed_at) throw new Error('Verify this account email before granting administrator access.');

  const { data: profile, error: profileError } = await supabaseAdmin.from('profiles')
    .update({ role: 'admin', approval_status: 'approved', approval_note: null, approved_at: new Date().toISOString() })
    .eq('id', user.id)
    .select('id, email, role, approval_status')
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) throw new Error('The Auth account has no profile row. Apply the Supabase schema/migration, then retry.');

  console.log(`Admin access enabled for ${profile.email || requestedEmail}.`);
  console.log('Sign in through the WS Hub portal using this account’s existing sign-in method.');
} catch (error) {
  console.error(`Could not grant admin access: ${error.message}`);
  process.exitCode = 1;
}
