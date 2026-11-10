import { format } from 'date-fns';
import {
  getDailyMotivation,
  getDashboardPayload,
  getReminderConfig,
  recordReminderDispatch,
} from './db';

export interface DispatchResult {
  dispatched: boolean;
  targetFriends: string;
  channelsUsed: string[];
  messageText: string;
  details: string;
}

async function sendNtfyMobilePush(
  topic: string,
  title: string,
  message: string,
  appUrl: string
): Promise<boolean> {
  try {
    const cleanTopic = topic.replace(/[^a-zA-Z0-9_-]/g, '') || 'bharath-cd-r-attendance-8pm';
    const response = await fetch(`https://ntfy.sh/${cleanTopic}`, {
      method: 'POST',
      headers: {
        Title: title,
        Priority: 'high',
        Tags: 'alarm_clock,shield',
        Click: `${appUrl}/#check-in`,
      },
      body: message,
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function sendTwilioSms(
  toPhone: string,
  bodyText: string
): Promise<{ ok: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromPhone = process.env.TWILIO_FROM_PHONE?.trim();

  if (!sid || !token || !fromPhone) {
    return { ok: false, error: 'Twilio credentials not configured' };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const params = new URLSearchParams({
      To: toPhone,
      From: fromPhone,
      Body: bodyText,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    return { ok: response.ok };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Twilio request failed',
    };
  }
}

export async function dispatchPhoneAttendanceReminder(options: {
  forceManual?: boolean;
}): Promise<DispatchResult> {
  const config = getReminderConfig();
  const dashboard = getDashboardPayload();
  const motivation = getDailyMotivation();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const isMarked =
    config.todayStatus.userMarked ||
    (config.todayStatus.bharathCdMarked && config.todayStatus.bharathRMarked);

  if (!options.forceManual && isMarked) {
    return {
      dispatched: false,
      targetFriends: 'Already Marked',
      channelsUsed: [],
      messageText: 'Daily attendance has already been marked for today.',
      details: 'No 8:00 PM reminder needed because attendance is already logged today.',
    };
  }

  const targetLabel = 'Discipline Practitioner';
  const uStreak = dashboard.userStats.currentStreak;

  const appUrl =
    process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
      ? process.env.APP_URL
      : 'http://localhost:3000';

  const messageText = `8:00 PM Attendance Check-In (${todayStr}): Time to log your daily self-control attendance! Active Streak: ${uStreak} clean days. Log here: ${appUrl}/#check-in`;

  const channelsUsed: string[] = [];

  // Channel 1: Instant Mobile Push via ntfy.sh
  const ntfyOk = await sendNtfyMobilePush(
    config.ntfyTopic,
    '8:00 PM Attendance Reminder — BeyondLimits',
    messageText,
    appUrl
  );
  if (ntfyOk) {
    channelsUsed.push(`Mobile Push (ntfy.sh/${config.ntfyTopic})`);
  }

  // Channel 2: Direct SMS via Twilio if configured
  if (config.twilioConfigured) {
    const phonesToNotify: string[] = [];
    if (options.forceManual || !config.todayStatus.bharathCdMarked) {
      if (config.bharathCdPhone) phonesToNotify.push(config.bharathCdPhone);
    }
    if (options.forceManual || !config.todayStatus.bharathRMarked) {
      if (config.bharathRPhone) phonesToNotify.push(config.bharathRPhone);
    }

    let smsCount = 0;
    for (const phone of phonesToNotify) {
      const res = await sendTwilioSms(phone, messageText);
      if (res.ok) smsCount += 1;
    }
    if (smsCount > 0) {
      channelsUsed.push(`Twilio SMS (${smsCount} phone${smsCount > 1 ? 's' : ''})`);
    }
  }

  const status: 'sent' | 'failed' = channelsUsed.length > 0 ? 'sent' : 'failed';
  const channelSummary =
    channelsUsed.length > 0 ? channelsUsed.join(' + ') : 'Local 8:00 PM Alert';

  recordReminderDispatch({
    reminderDate: todayStr,
    targetFriends: targetLabel,
    channel: channelSummary,
    status,
    messagePreview: messageText,
    markDateTriggered: true,
  });

  return {
    dispatched: status === 'sent',
    targetFriends: targetLabel,
    channelsUsed,
    messageText,
    details:
      status === 'sent'
        ? `Sent 8:00 PM phone reminder to ${targetLabel} via ${channelSummary}.`
        : 'Recorded reminder attempt.',
  };
}
