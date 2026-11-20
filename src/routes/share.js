import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { env } from '../config/env.js';
import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler, ApiError } from '../utils/helpers.js';

const router = Router();
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const publicUrl = (value, fallback) => {
  try {
    const url = new URL(value || fallback);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : fallback;
  } catch {
    return fallback;
  }
};

router.get('/business/:slug', asyncHandler(async (req, res) => {
  const { data: business, error } = await supabaseAdmin.from('businesses')
    .select('name, slug, description, logo_url, cover_url, phone, email, website, city, state, country, status')
    .eq('slug', req.params.slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  if (!business) throw new ApiError(404, 'Business not found');

  const siteUrl = env.frontendUrl;
  const destination = `${siteUrl}/#/businesses/${encodeURIComponent(business.slug)}`;
  const shareUrl = `${siteUrl}/share/business/${encodeURIComponent(business.slug)}`;
  const image = publicUrl(business.logo_url || business.cover_url, `${siteUrl}/images/hero.jpg`);
  const location = [business.city, business.state, business.country].filter(Boolean).join(', ');
  const contact = [business.phone && `Phone: ${business.phone}`, business.email && `Email: ${business.email}`, business.website && `Website: ${business.website}`, location && `Location: ${location}`].filter(Boolean).join(' · ').slice(0, 240);
  const synopsisText = (business.description || `${business.name} on WS Hub.`).replace(/\s+/g, ' ').trim();
  const synopsis = synopsisText.slice(0, contact ? 240 : 480);
  const previewDescription = [synopsis, contact && `Contact: ${contact}`].filter(Boolean).join(' | ').slice(0, 500);
  const title = `${business.name} | WS Hub`;
  const nonce = randomBytes(18).toString('base64');

  res.set({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`,
    'X-Content-Type-Options': 'nosniff',
  });
  res.status(200).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(previewDescription)}">
<link rel="canonical" href="${escapeHtml(shareUrl)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="WS Hub">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(previewDescription)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:secure_url" content="${escapeHtml(image)}">
<meta property="og:image:alt" content="${escapeHtml(`${business.name} logo`)}">
<meta property="og:url" content="${escapeHtml(shareUrl)}">
${business.phone ? `<meta property="og:phone_number" content="${escapeHtml(business.phone)}">` : ''}
${business.email ? `<meta property="og:email" content="${escapeHtml(business.email)}">` : ''}
${business.website ? `<meta property="og:website" content="${escapeHtml(business.website)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(previewDescription)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
</head>
<body>
<main><img src="${escapeHtml(image)}" alt="${escapeHtml(`${business.name} logo`)}" width="160"><h1>${escapeHtml(business.name)}</h1><p>${escapeHtml(synopsis)}</p>${contact ? `<p>${escapeHtml(contact)}</p>` : ''}<p>Opening <a href="${escapeHtml(destination)}">${escapeHtml(business.name)} on WS Hub</a>…</p></main>
<script nonce="${nonce}">window.location.replace(${JSON.stringify(destination)});</script>
</body>
</html>`);
}));

export default router;
