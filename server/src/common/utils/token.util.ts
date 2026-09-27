import { createHash, randomBytes } from 'crypto';

/** Opaque random tokens (refresh tokens, password reset tokens) are only
 * ever stored hashed — the raw value is returned to the caller once and
 * never persisted, so a DB leak doesn't hand out usable tokens. */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
