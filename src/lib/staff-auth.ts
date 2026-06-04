import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const STAFF_ACCESS_COOKIE_NAME = 'harlem_staff_access';

const STAFF_ACCESS_COOKIE_PREFIX = 'staff:v1';
const STAFF_ACCESS_COOKIE_MAX_AGE = 60 * 60 * 12;

export function getStaffAccessCode() {
  return process.env.STAFF_ACCESS_CODE?.trim() || null;
}

export function isStaffAccessConfigured() {
  return Boolean(getStaffAccessCode());
}

function signStaffAccess(code: string) {
  return createHmac('sha256', code)
    .update(STAFF_ACCESS_COOKIE_PREFIX)
    .digest('hex');
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyStaffAccessCode(input: unknown) {
  const configuredCode = getStaffAccessCode();

  if (!configuredCode || typeof input !== 'string') {
    return false;
  }

  return safeCompare(input, configuredCode);
}

export function createStaffAccessCookieValue() {
  const configuredCode = getStaffAccessCode();

  if (!configuredCode) {
    return null;
  }

  return `${STAFF_ACCESS_COOKIE_PREFIX}.${signStaffAccess(configuredCode)}`;
}

export function verifyStaffAccessCookieValue(value: string | undefined | null) {
  const configuredCode = getStaffAccessCode();

  if (!configuredCode || !value) {
    return false;
  }

  const expectedValue = createStaffAccessCookieValue();

  if (!expectedValue) {
    return false;
  }

  return safeCompare(value, expectedValue);
}

export function getStaffAccessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: STAFF_ACCESS_COOKIE_MAX_AGE,
  };
}

export function isStaffAuthorized(request: NextRequest) {
  return verifyStaffAccessCookieValue(request.cookies.get(STAFF_ACCESS_COOKIE_NAME)?.value);
}

export function requireStaffAccess(request: NextRequest) {
  if (isStaffAuthorized(request)) {
    return null;
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
