import { NextResponse } from 'next/server';
import { STAFF_ACCESS_COOKIE_NAME } from '@/lib/staff-auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(STAFF_ACCESS_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return response;
}
