import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  deleteAttendanceById,
  getDashboardPayload,
  updateAttendanceReasonById,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

const UpdateReasonSchema = z.object({
  reason: z.string(),
  triggerCategory: z.string().optional(),
  emotionState: z.string().optional(),
  controlNote: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'Invalid record ID.' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = UpdateReasonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid update payload.' },
        { status: 400 }
      );
    }

    const updated = updateAttendanceReasonById({
      id: numericId,
      ...parsed.data,
    });
    const dashboard = getDashboardPayload();

    return NextResponse.json({ record: updated, dashboard }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update reason column';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'Invalid record ID.' }, { status: 400 });
    }

    deleteAttendanceById(numericId);
    const dashboard = getDashboardPayload();

    return NextResponse.json({ deletedId: numericId, dashboard }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete attendance record';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
