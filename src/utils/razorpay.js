import crypto from 'node:crypto';

export function verifyCheckoutSignature(secret, orderId, paymentId, signature) {
  if (!/^[a-f\d]{64}$/i.test(signature || '')) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest();
  let supplied;
  try { supplied = Buffer.from(signature || '', 'hex'); } catch { return false; }
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}
