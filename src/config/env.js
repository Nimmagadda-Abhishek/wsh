import 'dotenv/config';

const req = (k) => {
  if (!process.env[k]) throw new Error(`Missing required env var: ${k}`);
  return process.env[k];
};

export const env = {
  port: Number(process.env.PORT) || 4000,
  isProd: process.env.NODE_ENV === 'production',
  clientUrls: (process.env.CLIENT_URLS || 'https://ws-portel.web.app').split(',').map((s) => s.trim()),
  supabaseUrl: req('SUPABASE_URL'),
  supabaseAnonKey: req('SUPABASE_ANON_KEY'),
  supabaseServiceKey: req('SUPABASE_SERVICE_ROLE_KEY'),
  emailRedirectUrl: process.env.EMAIL_REDIRECT_URL,
  passwordResetRedirectUrl: process.env.PASSWORD_RESET_REDIRECT_URL,
  rzpKeyId: req('RAZORPAY_KEY_ID'),
  rzpKeySecret: req('RAZORPAY_KEY_SECRET'),
  // Optional when the Razorpay webhook is not configured; browser payment verification remains available.
  rzpWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
};
