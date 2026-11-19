import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { ApiError, asyncHandler, getPage, pageMeta, isUuid } from '../utils/helpers.js';

const r = Router();

async function listMembers(memberTypes, req, res) {
  const pg = getPage(req.query);
  const { data: members, count, error } = await supabaseAdmin.from('profiles')
    .select('id, member_type, full_name, username, email, phone, avatar_url, bio, city, country, social_links, created_at', { count: 'exact' })
    .in('member_type', memberTypes).eq('approval_status', 'approved')
    .order('created_at', { ascending: false }).range(pg.from, pg.to);
  if (error) throw error;

  const ids = members.map((member) => member.id);
  let businesses = [];
  if (ids.length) {
    const result = await supabaseAdmin.from('businesses')
      .select('id, owner_id, name, slug, logo_url, city, description')
      .in('owner_id', ids).eq('status', 'published').eq('listing_fee_paid', true).order('created_at', { ascending: false });
    if (result.error) throw result.error;
    businesses = result.data || [];
  }
  const businessesByOwner = new Map();
  for (const business of businesses) {
    const list = businessesByOwner.get(business.owner_id) || [];
    list.push(business);
    businessesByOwner.set(business.owner_id, list);
  }
  res.json({
    data: members.map(({ id, ...member }) => ({ ...member, id, businesses: businessesByOwner.get(id) || [] })),
    meta: pageMeta(pg, count),
  });
}

r.get('/founders', asyncHandler((req, res) => listMembers(['founder', 'business'], req, res)));
r.get('/investors', asyncHandler((req, res) => listMembers(['investor', 'mentor'], req, res)));

// Public profile detail by account ID, with only approved public fields/listings.
r.get('/members/:id', asyncHandler(async (req, res) => {
  if (!isUuid(req.params.id)) throw new ApiError(400, 'Invalid member id');
  const { data: profile, error } = await supabaseAdmin.from('profiles')
    .select('id, member_type, full_name, username, email, phone, avatar_url, bio, city, country, social_links, created_at')
    .eq('id', req.params.id).eq('approval_status', 'approved').maybeSingle();
  if (error) throw error;
  if (!profile) throw new ApiError(404, 'Member profile not found');
  const { data: businesses, error: businessError } = await supabaseAdmin.from('businesses')
    .select('id, name, slug, logo_url, city, description')
    .eq('owner_id', profile.id).eq('status', 'published').eq('listing_fee_paid', true).order('created_at', { ascending: false });
  if (businessError) throw businessError;
  res.json({ data: { ...profile, businesses: businesses || [] } });
}));

export default r;
