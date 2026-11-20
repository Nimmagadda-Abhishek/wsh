import 'dotenv/config';

const req = (k) => {
  if (!process.env[k]) throw new Error(`Missing required env var: ${k}`);
  return process.env[k];
};

export const env = {
  port: Number(process.env.PORT) || 4000,
  isProd: process.env.NODE_ENV === 'production',
  clientUrls: [...new Set(['https://warangal-startups.vercel.app', 'http://warangal-startups.vercel.app', 'https://ws-portel.web.app', ...(process.env.CLIENT_URLS || '').split(',').map((s) => s.trim()).filter(Boolean)])],
  frontendUrl: (process.env.FRONTEND_URL || 'https://warangal-startups.vercel.app').replace(/\/+$/, ''),
  supabaseUrl: req('SUPABASE_URL'),
  supabaseAnonKey: req('SUPABASE_ANON_KEY'),
  supabaseServiceKey: req('SUPABASE_SERVICE_ROLE_KEY'),
  emailRedirectUrl: process.env.EMAIL_REDIRECT_URL,
  passwordResetRedirectUrl: process.env.PASSWORD_RESET_REDIRECT_URL,
  paymentsEnabled: process.env.PAYMENTS_ENABLED === 'true',
  rzpKeyId: process.env.RAZORPAY_KEY_ID || '',
  rzpKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  // Optional when the Razorpay webhook is not configured; browser payment verification remains available.
  rzpWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
};
