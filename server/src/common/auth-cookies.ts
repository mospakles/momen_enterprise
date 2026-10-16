import type { CookieOptions, Request } from 'express';
import type { ConfigService } from '@nestjs/config';

type AuthAudience = 'customer' | 'admin';

export function accessCookieName(audience: AuthAudience) {
  return `momen_${audience}_access`;
}

export function refreshCookieName(audience: AuthAudience) {
  return `momen_${audience}_refresh`;
}

export function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

export function authCookieOptions(
  config: ConfigService,
  kind: 'access' | 'refresh',
): CookieOptions {
  const production = config.get('NODE_ENV') === 'production';
  const configuredSameSite = config.get<'lax' | 'strict' | 'none'>(
    'AUTH_COOKIE_SAME_SITE',
  );
  const sameSite = configuredSameSite ?? (production ? 'lax' : 'lax');
  return {
    httpOnly: true,
    secure: production || sameSite === 'none',
    sameSite,
    path: '/api',
    maxAge:
      kind === 'access'
        ? 15 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000,
  };
}
