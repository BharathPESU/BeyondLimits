import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticatedRequest } from '@/lib/admin-auth';
import {
  querySupabaseTable,
  ALLOWED_ADMIN_TABLES,
  AdminTableName,
} from '@/lib/admin-data-service';

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticatedRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const table = (searchParams.get('table') || 'users_profile') as AdminTableName;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);
  const searchQuery = searchParams.get('search') || '';

  if (!ALLOWED_ADMIN_TABLES.includes(table)) {
    return NextResponse.json(
      { error: `Table '${table}' not permitted. Allowed tables: ${ALLOWED_ADMIN_TABLES.join(', ')}` },
      { status: 400 }
    );
  }

  const result = await querySupabaseTable(table, {
    page,
    pageSize,
    searchQuery,
  });

  return NextResponse.json({
    table,
    allowedTables: ALLOWED_ADMIN_TABLES,
    ...result,
  });
}
