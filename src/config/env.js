import 'dotenv/config';

const frontendUrl = (process.env.FRONTEND_URL || 'https://warangal-startups.vercel.app').replace(/\/+$/, '');
const frontendOrigin = new URL(frontendUrl).origin;
const clientRedirect = (key, route) => {
  // Auth links must point to the SPA origin and hash route, never the API's Site URL.
  // This also corrects legacy values such as /auth/verified without the required #/.
  try {
    const configured = process.env[key] && new URL(process.env[key]);
    if (configured && configured.origin === frontendOrigin)
      return `${frontendOrigin}/#/${route}`;
  } catch { /* Use the configured frontend as the safe default. */ }
  return `${frontendOrigin}/#/${route}`;
};

const req = (k) => {
  if (!process.env[k]) throw new Error(`Missing required env var: ${k}`);
  return process.env[k];
};

export const env = {
  port: Number(process.env.PORT) || 4000,
  isProd: process.env.NODE_ENV === 'production',
  clientUrls: [...new Set(['https://warangal-startups.vercel.app', 'http://warangal-startups.vercel.app', 'https://ws-portel.web.app', ...(process.env.CLIENT_URLS || '').split(',').map((s) => s.trim()).filter(Boolean)])],
  frontendUrl,
  supabaseUrl: req('SUPABASE_URL'),
  supabaseAnonKey: req('SUPABASE_ANON_KEY'),
  supabaseServiceKey: req('SUPABASE_SERVICE_ROLE_KEY'),
  emailRedirectUrl: clientRedirect('EMAIL_REDIRECT_URL', 'auth/verified'),
  passwordResetRedirectUrl: clientRedirect('PASSWORD_RESET_REDIRECT_URL', 'auth/reset-password'),
  paymentsEnabled: process.env.PAYMENTS_ENABLED === 'true',
  rzpKeyId: process.env.RAZORPAY_KEY_ID || '',
  rzpKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  // Optional when the Razorpay webhook is not configured; browser payment verification remains available.
  rzpWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
};
