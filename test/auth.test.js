import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isRecoveryAccessToken } from '../src/utils/auth.js';
import { verifyCheckoutSignature } from '../src/utils/razorpay.js';
import { createHmac } from 'node:crypto';

const tokenWith = (payload) => `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;

test('allows a recovery session claim', () => {
  assert.equal(isRecoveryAccessToken(tokenWith({ amr: [{ method: 'recovery' }] })), true);
});

test('rejects ordinary login tokens and malformed tokens', () => {
  assert.equal(isRecoveryAccessToken(tokenWith({ amr: [{ method: 'password' }] })), false);
  assert.equal(isRecoveryAccessToken(tokenWith({})), false);
  assert.equal(isRecoveryAccessToken('bad-token'), false);
});

test('business detail query selects its owner through the explicit foreign key', async () => {
  const source = await readFile(new URL('../src/routes/business.js', import.meta.url), 'utf8');
  assert.match(source, /owner:profiles!businesses_owner_id_fkey\(/);
});

test('signup fee signature is verified and malformed/tampered signatures fail', () => {
  const secret = 'test-secret';
  const orderId = 'order_test123';
  const paymentId = 'pay_test123';
  const signature = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  assert.equal(verifyCheckoutSignature(secret, orderId, paymentId, signature), true);
  assert.equal(verifyCheckoutSignature(secret, orderId, paymentId, `${signature.slice(0, -1)}0`), false);
  assert.equal(verifyCheckoutSignature(secret, orderId, paymentId, `${signature}bad`), false);
});

test('signup requires a verified joining-fee payment and admin API exposes approval actions', async () => {
  const authSource = await readFile(new URL('../src/routes/auth.js', import.meta.url), 'utf8');
  const adminSource = await readFile(new URL('../src/routes/admin.js', import.meta.url), 'utf8');
  assert.match(authSource, /r\.post\('\/signup'/);
  assert.match(authSource, /r\.post\('\/signup\/order'/);
  assert.match(authSource, /razorpay_signature/);
  assert.match(authSource, /signup_payments/);
  assert.match(authSource, /member_type: memberType/);
  assert.match(adminSource, /r\.patch\('\/users\/:id\/approval'/);
});

test('admin payments list includes payer and purchase details with status filtering', async () => {
  const adminSource = await readFile(new URL('../src/routes/admin.js', import.meta.url), 'utf8');
  assert.match(adminSource, /r\.get\('\/payments'/);
  assert.match(adminSource, /profiles!payments_user_id_fkey\(full_name, email\)/);
  assert.match(adminSource, /query\.eq\('status'/);
} );

test('public member directories are restricted to approved role categories', async () => {
  const directorySource = await readFile(new URL('../src/routes/directory.js', import.meta.url), 'utf8');
  const authSource = await readFile(new URL('../src/routes/auth.js', import.meta.url), 'utf8');
  assert.match(directorySource, /'\/founders'/);
  assert.match(directorySource, /\['founder', 'business'\]/);
  assert.match(directorySource, /\['investor', 'mentor'\]/);
  assert.match(directorySource, /eq\('approval_status', 'approved'\)/);
  assert.match(authSource, /member_type: memberType/);
});
