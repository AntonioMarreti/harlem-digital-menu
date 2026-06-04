import { cookies } from 'next/headers';
import {
  STAFF_ACCESS_COOKIE_NAME,
  isStaffAccessConfigured,
  verifyStaffAccessCookieValue,
} from '@/lib/staff-auth';
import StaffAccessGate from './StaffAccessGate';
import StaffDashboardClient from './StaffDashboardClient';

export default function StaffPage() {
  const isAuthorized = verifyStaffAccessCookieValue(
    cookies().get(STAFF_ACCESS_COOKIE_NAME)?.value
  );

  if (!isAuthorized) {
    return <StaffAccessGate isAccessConfigured={isStaffAccessConfigured()} />;
  }

  return <StaffDashboardClient />;
}
