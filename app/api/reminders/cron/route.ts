import { NextResponse } from 'next/server';
import { getReminderConfig } from '@/lib/db';
import { dispatchPhoneAttendanceReminder } from '@/lib/reminder-dispatcher';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = getReminderConfig();
    if (!config.enabled) {
      return NextResponse.json(
        { skipped: true, reason: '8:00 PM reminder is disabled in settings.' },
        { status: 200 }
      );
    }

    const result = await dispatchPhoneAttendanceReminder({ forceManual: false });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Cron reminder execution failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
