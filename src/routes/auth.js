import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin, makeAnonClient } from '../config/supabase.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ApiError, asyncHandler } from '../utils/helpers.js';
import { isRecoveryAccessToken } from '../utils/auth.js';
import Razorpay from 'razorpay';
import { verifyCheckoutSignature } from '../utils/razorpay.js';

const r = Router();

const password = z.string().min(8, 'Password must be at least 8 characters').max(72);
const email = z.string().trim().toLowerCase().email();
const rzp = new Razorpay({ key_id: env.rzpKeyId, key_secret: env.rzpKeySecret });

r.post('/signup/order', validate(z.object({ email })), asyncHandler(async (req, res) => {
  const order = await rzp.orders.create({
    amount: 200, currency: 'INR', receipt: `join_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    notes: { purpose: 'wshub_account_joining_fee' },
  });
  const { error } = await supabaseAdmin.from('signup_payments').insert({
    email: req.body.email, razorpay_order_id: order.id, amount_minor: 200, status: 'created',
  });
  if (error) throw error;
  res.status(201).json({ data: { orderId: order.id, amount: 200, currency: 'INR', keyId: env.rzpKeyId } });
}));

// POST /api/auth/signup
r.post('/signup', validate(z.object({
  email, password,
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(20).optional(),
  accountType: z.enum(['user', 'business_owner']).optional(),
  memberType: z.enum(['founder', 'business', 'investor', 'mentor', 'student', 'professional']).optional(),
  razorpay_order_id: z.string().min(5),
  razorpay_payment_id: z.string().min(5),
  razorpay_signature: z.string().regex(/^[a-f\d]{64}$/i),
})), asyncHandler(async (req, res) => {
  const { email, password, fullName, phone, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const memberType = req.body.memberType || (req.body.accountType === 'business_owner' ? 'business' : 'founder');

  const { data: fee, error: feeError } = await supabaseAdmin.from('signup_payments').select('*')
    .eq('razorpay_order_id', razorpay_order_id).maybeSingle();
  if (feeError) throw feeError;
  if (!fee || fee.email !== email || fee.amount_minor !== 200 || fee.status !== 'created')
    throw new ApiError(400, 'A valid, unused ₹2 joining-fee payment is required');
  if (!verifyCheckoutSignature(env.rzpKeySecret, razorpay_order_id, razorpay_payment_id, razorpay_signature))
    throw new ApiError(400, 'Payment signature could not be verified');
  const payment = await rzp.payments.fetch(razorpay_payment_id);
  if (payment.order_id !== razorpay_order_id || payment.amount !== 200 || payment.currency !== 'INR')
    throw new ApiError(400, 'Payment does not match the joining-fee order');
  if (payment.status === 'authorized') await rzp.payments.capture(razorpay_payment_id, 200, 'INR');
  const confirmedPayment = payment.status === 'captured' ? payment : await rzp.payments.fetch(razorpay_payment_id);
  if (confirmedPayment.status !== 'captured') throw new ApiError(402, 'Joining-fee payment has not been captured');

  const { data, error } = await makeAnonClient().auth.signUp({
    email, password,
    options: {
      data: { full_name: fullName, phone, member_type: memberType, role: memberType === 'business' ? 'business_owner' : 'user' },
      emailRedirectTo: env.emailRedirectUrl,
    },
  });
  if (error) throw new ApiError(error.status || 400, error.message);
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
    throw new ApiError(409, 'An account already exists for this email');
  const { error: paymentRecordError } = await supabaseAdmin.from('signup_payments').update({
    status: 'paid', razorpay_payment_id, user_id: data.user?.id, paid_at: new Date().toISOString(),
  }).eq('id', fee.id).eq('status', 'created');
  if (paymentRecordError) throw paymentRecordError;
  res.status(201).json({
    data: {
      user: { id: data.user?.id, email: data.user?.email },
      session: data.session, // null when email confirmation is enabled
      emailConfirmationRequired: !data.session,
      approvalStatus: 'pending',
      joiningFee: { amount: 200, currency: 'INR', status: 'paid' },
    },
  });
}));

// POST /api/auth/login
r.post('/login', validate(z.object({ email, password: z.string().min(1) })), asyncHandler(async (req, res) => {
  const { data, error } = await makeAnonClient().auth.signInWithPassword(req.body);
  if (error) throw new ApiError(401, error.message);
  res.json({ data: { user: { id: data.user.id, email: data.user.email }, session: data.session } });
}));

// POST /api/auth/refresh
r.post('/refresh', validate(z.object({ refreshToken: z.string().min(1) })), asyncHandler(async (req, res) => {
  const { data, error } = await makeAnonClient().auth.refreshSession({ refresh_token: req.body.refreshToken });
  if (error) throw new ApiError(401, error.message);
  res.json({ data: { session: data.session } });
}));

// POST /api/auth/logout
r.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  await supabaseAdmin.auth.admin.signOut(req.token);
  res.json({ data: { message: 'Logged out' } });
}));

// POST /api/auth/resend-verification
r.post('/resend-verification', validate(z.object({ email })), asyncHandler(async (req, res) => {
  await makeAnonClient().auth.resend({ type: 'signup', email: req.body.email, options: { emailRedirectTo: env.emailRedirectUrl } });
  res.json({ data: { message: 'If the account exists, a verification email has been sent' } });
}));

// POST /api/auth/forgot-password  (always 200 to avoid account enumeration)
r.post('/forgot-password', validate(z.object({ email })), asyncHandler(async (req, res) => {
  await makeAnonClient().auth.resetPasswordForEmail(req.body.email, { redirectTo: env.passwordResetRedirectUrl });
  res.json({ data: { message: 'If the account exists, a reset link has been sent' } });
}));

// POST /api/auth/reset-password  (Bearer = recovery access token from the email link)
r.post('/reset-password', requireAuth, validate(z.object({ password })), asyncHandler(async (req, res) => {
  // getUser() in requireAuth validates the Supabase token; accept only the
  // recovery session issued by the password reset email, never a normal login.
  if (!isRecoveryAccessToken(req.token)) throw new ApiError(401, 'Use the password recovery link from your email');
  const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, { password: req.body.password });
  if (error) throw new ApiError(400, error.message);
  res.json({ data: { message: 'Password updated' } });
}));

// POST /api/auth/change-password
r.post('/change-password', requireAuth, validate(z.object({ currentPassword: z.string().min(1), newPassword: password })),
  asyncHandler(async (req, res) => {
    const { error: verr } = await makeAnonClient().auth.signInWithPassword({ email: req.user.email, password: req.body.currentPassword });
    if (verr) throw new ApiError(401, 'Current password is incorrect');
    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, { password: req.body.newPassword });
    if (error) throw new ApiError(400, error.message);
    res.json({ data: { message: 'Password changed' } });
  }));

// GET /api/auth/me
r.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', req.user.id).single();
  res.json({ data: { id: req.user.id, email: req.user.email, emailVerified: !!req.user.email_confirmed_at, profile } });
}));

export default r;
