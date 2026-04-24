import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { NextRequest } from 'next/server';

type Duration = `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`;

function createLimiter(limit: number, window: Duration, prefix: string): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: false,
    prefix,
  });
}

export const verifyLimiter = createLimiter(100, '1 m', 'rl:verify');
export const registerLimiter = createLimiter(10, '1 h', 'rl:register');

export function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfter: number };

export async function checkRateLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<RateLimitResult> {
  if (!limiter) return { allowed: true };
  const result = await limiter.limit(key);
  if (result.success) return { allowed: true };
  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return { allowed: false, retryAfter };
}
