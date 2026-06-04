import { NextRequest, NextResponse } from 'next/server';
import {
  STAFF_ACCESS_COOKIE_NAME,
  createStaffAccessCookieValue,
  getStaffAccessCookieOptions,
  isStaffAccessConfigured,
  verifyStaffAccessCode,
} from '@/lib/staff-auth';

export async function POST(request: NextRequest) {
  if (!isStaffAccessConfigured()) {
    return NextResponse.json({ error: 'Staff access is not configured' }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const code = body && typeof body === 'object' && 'code' in body ? body.code : null;

  if (!verifyStaffAccessCode(code)) {
    return NextResponse.json({ error: 'Invalid staff code' }, { status: 401 });
  }

  const cookieValue = createStaffAccessCookieValue();

  if (!cookieValue) {
    return NextResponse.json({ error: 'Staff access is not configured' }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(STAFF_ACCESS_COOKIE_NAME, cookieValue, getStaffAccessCookieOptions());

  return response;
}
