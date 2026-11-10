import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDashboardPayload, upsertAttendanceRecord } from '@/lib/db';
import { syncAttendanceToSupabase } from '@/lib/supabase-service';

export const dynamic = 'force-dynamic';

const UpsertAttendanceSchema = z
  .object({
    friendId: z.string().optional().default('user'),
    friendName: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    relapsed: z.boolean(),
    reason: z.string().optional().default(''),
    triggerCategory: z.string().optional().default('None'),
    emotionState: z.string().optional().default('Focused'),
    controlNote: z.string().optional().default(''),
    urgeIntensity: z.number().min(1).max(10).optional().default(2),
  })
  .refine(
    (data) => {
      if (data.relapsed) {
        return data.reason.trim().length >= 3;
      }
      return true;
    },
    {
      message:
        'When marking as Masturbated / Relapsed, you must enter a clear reason (at least 3 characters) explaining why.',
      path: ['reason'],
    }
  );

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refDate = searchParams.get('date') || undefined;
    const payload = getDashboardPayload(refDate);
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load SQLite attendance data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = UpsertAttendanceSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue?.message || 'Invalid attendance input.',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const record = upsertAttendanceRecord(parsed.data);
    const payload = getDashboardPayload();

    return NextResponse.json(
      {
        record,
        dashboard: payload,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to save attendance record';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
