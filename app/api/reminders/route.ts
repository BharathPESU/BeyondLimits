import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getDashboardPayload,
  getReminderConfig,
  updateReminderSettings,
} from '@/lib/db';
import { dispatchPhoneAttendanceReminder } from '@/lib/reminder-dispatcher';

export const dynamic = 'force-dynamic';

const UpdateReminderSchema = z.object({
  bharathCdPhone: z.string().min(5, 'Enter a valid phone number for Bharath CD'),
  bharathRPhone: z.string().min(5, 'Enter a valid phone number for Bharath R'),
  reminderTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format (e.g., 20:00 for 8:00 PM)'),
  timezone: z.string().min(2).default('Asia/Kolkata'),
  enabled: z.boolean(),
  ntfyTopic: z.string().min(3, 'Enter a valid mobile push topic name'),
});

export async function GET() {
  try {
    const config = getReminderConfig();
    return NextResponse.json({ reminderConfig: config }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load reminder config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = UpdateReminderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid reminder settings' },
        { status: 400 }
      );
    }

    const updatedConfig = updateReminderSettings(parsed.data);
    const dashboard = getDashboardPayload();
    return NextResponse.json(
      { reminderConfig: updatedConfig, dashboard },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update reminder settings';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const forceManual = Boolean(body?.forceManual);

    const result = await dispatchPhoneAttendanceReminder({ forceManual });
    const dashboard = getDashboardPayload();

    return NextResponse.json(
      {
        result,
        dashboard,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to dispatch phone reminder';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
