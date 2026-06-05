import { NextRequest, NextResponse } from 'next/server';
import {
  STAFF_ACCESS_COOKIE_NAME,
  createStaffAccessCookieValue,
  getStaffAccessCookieOptions,
  isStaffAccessConfigured,
  verifyStaffAccessCode,
} from '@/lib/staff-auth';

// Note: This is a best-effort in-memory rate limit for serverless runtime, 
// not a global distributed limit. It applies per lambda container.
type RateLimitRecord = { count: number; lockedUntil: number };
const rateLimitMap = new Map<string, RateLimitRecord>();

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return request.ip || 'unknown';
}

function getLockoutSeconds(attempts: number): number {
  if (attempts >= 8) return 30 * 60; // 30 minutes
  if (attempts >= 6) return 5 * 60;  // 5 minutes
  if (attempts >= 5) return 30;      // 30 seconds
  return 0;
}

export async function POST(request: NextRequest) {
  if (!isStaffAccessConfigured()) {
    return NextResponse.json({ error: 'Staff access is not configured' }, { status: 503 });
  }

  const ip = getClientIp(request);
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, lockedUntil: 0 };

  if (record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return NextResponse.json(
      { error: 'Too many login attempts', code: 'STAFF_LOGIN_RATE_LIMITED' },
      { 
        status: 429, 
        headers: { 'Retry-After': String(retryAfterSeconds) } 
      }
    );
  }

  const body = await request.json().catch(() => null);
  const code = body && typeof body === 'object' && 'code' in body ? body.code : null;

  if (!verifyStaffAccessCode(code)) {
    record.count += 1;
    const lockoutSeconds = getLockoutSeconds(record.count);
    
    if (lockoutSeconds > 0) {
      record.lockedUntil = now + lockoutSeconds * 1000;
    }
    
    rateLimitMap.set(ip, record);

    if (record.count < 5) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return NextResponse.json({ error: 'Invalid staff code' }, { status: 401 });
  }

  rateLimitMap.delete(ip);

  const cookieValue = createStaffAccessCookieValue();

  if (!cookieValue) {
    return NextResponse.json({ error: 'Staff access is not configured' }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(STAFF_ACCESS_COOKIE_NAME, cookieValue, getStaffAccessCookieOptions());

  return response;
}
