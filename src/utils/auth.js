export function isRecoveryAccessToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return Array.isArray(payload.amr) && payload.amr.some((method) => method?.method === 'recovery');
  } catch {
    return false;
  }
}
