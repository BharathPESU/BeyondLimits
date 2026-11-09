import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticatedRequest } from '@/lib/admin-auth';
import {
  getActiveWorkoutRoutines,
  saveActiveWorkoutRoutines,
  WorkoutRoutine,
} from '@/lib/admin-data-service';

export async function GET() {
  const routines = await getActiveWorkoutRoutines();
  return NextResponse.json(routines);
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticatedRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
  }

  try {
    const routines: WorkoutRoutine[] = await request.json();
    if (!Array.isArray(routines) || routines.length === 0) {
      return NextResponse.json(
        { error: 'Invalid workout routines array provided' },
        { status: 400 }
      );
    }

    const result = await saveActiveWorkoutRoutines(routines);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${result.count} workout routines`,
      routines,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
