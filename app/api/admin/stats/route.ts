import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticatedRequest } from '@/lib/admin-auth';
import { getAdminAppTelemetry } from '@/lib/admin-data-service';

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticatedRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
  }

  const stats = await getAdminAppTelemetry();
  return NextResponse.json(stats);
}
