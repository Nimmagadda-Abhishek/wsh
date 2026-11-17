const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in the backend root .env file.');
  process.exit(1);
}

const requestedEmail = process.argv[2]?.trim().toLowerCase();
if (!requestedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail)) {
  console.error('Usage: npm run seed:admin -- admin@example.com');
  process.exit(1);
}

const { supabaseAdmin } = require('./src/config/supabase');

async function findAuthUserByEmail(email) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find(candidate => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
  throw new Error('Stopped after scanning 100,000 accounts. Contact support to locate this account.');
}

async function main() {
  const user = await findAuthUserByEmail(requestedEmail);
  if (!user) throw new Error(`No Supabase Auth account found for ${requestedEmail}. Create the account first.`);
  if (!user.email_confirmed_at) throw new Error('Verify this account email before granting administrator access.');

  const { data: profile, error } = await supabaseAdmin.from('profiles')
    .update({ role: 'admin' })
    .eq('id', user.id)
    .select('id, role')
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw new Error('The Auth account has no profile row. Apply supabase/schema.sql, then retry.');

  console.log(`Admin role enabled for ${user.email || requestedEmail}.`);
  console.log('Sign in to the portal using this account’s existing sign-in method.');
}

main().catch(error => {
  console.error(`Could not grant admin access: ${error.message}`);
  process.exitCode = 1;
});
