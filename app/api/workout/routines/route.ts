import { NextResponse } from 'next/server';
import { getActiveWorkoutRoutines } from '@/lib/admin-data-service';

export async function GET() {
  const routines = await getActiveWorkoutRoutines();
  return NextResponse.json(routines, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
}

