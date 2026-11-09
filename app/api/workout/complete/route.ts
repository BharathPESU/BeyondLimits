import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { recordWorkoutSession } from '@/lib/supabase-service';

export const dynamic = 'force-dynamic';

const WorkoutCompletionSchema = z.object({
  totalDurationSec: z.number().min(1).default(60),
  exercisesCompletedCount: z.number().min(1).max(12).default(12),
  skippedRestCount: z.number().default(0),
  restExtendedSeconds: z.number().default(0),
  exerciseDetails: z
    .array(
      z.object({
        exerciseId: z.string(),
        durationSec: z.number(),
        completed: z.boolean(),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const body = await request.json();
    const parsed = WorkoutCompletionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid workout completion payload', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await recordWorkoutSession({
      clerkUserId: userId || undefined,
      totalDurationSec: parsed.data.totalDurationSec,
      exercisesCompletedCount: parsed.data.exercisesCompletedCount,
      skippedRestCount: parsed.data.skippedRestCount,
      restExtendedSeconds: parsed.data.restExtendedSeconds,
      exerciseDetails: parsed.data.exerciseDetails,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Workout session recorded successfully',
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record workout';
    console.error('Workout completion API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

