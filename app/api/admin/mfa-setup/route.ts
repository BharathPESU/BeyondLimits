import { NextRequest, NextResponse } from 'next/server';
import { formatSecretForDisplay, generateOtpAuthUri, verifyTOTP, generateTOTP } from '@/lib/totp';

export async function GET() {
  const secret = (
    process.env.ADMIN_TOTP_SECRET || 'BEYONDLIMITSMFAADMINKEY234567AB'
  ).trim();

  const formattedSecret = formatSecretForDisplay(secret);
  const otpauthUri = generateOtpAuthUri({
    issuer: 'BeyondLimits',
    account: process.env.ADMIN_USERNAME || 'admin',
    secret,
  });

  return NextResponse.json({
    secret,
    formattedSecret,
    account: process.env.ADMIN_USERNAME || 'admin',
    issuer: 'BeyondLimits',
    periodSeconds: 30,
    digits: 6,
    otpauthUri,
    instructions: [
      'Open Microsoft Authenticator app on your phone.',
      'Tap "+" to add an account and select "Other (Google, Facebook, etc.)".',
      'Select "Or enter code manually".',
      `Enter Account name: "BeyondLimits Admin".`,
      `Enter Secret key: "${secret}".`,
      'Tap Finish/Save. The app will generate a 6-digit rolling code every 30 seconds.',
    ],
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;
    const secret = (
      process.env.ADMIN_TOTP_SECRET || 'BEYONDLIMITSMFAADMINKEY234567AB'
    ).trim();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: '6-digit code required' }, { status: 400 });
    }

    const valid = verifyTOTP(code, secret);
    const currentServerCode = generateTOTP(secret);

    return NextResponse.json({
      valid,
      message: valid ? 'Code verified successfully! Microsoft Authenticator is in sync.' : 'Invalid code.',
      // In development mode, display server code to assist setup verification
      hint: process.env.NODE_ENV !== 'production' ? `Current server code: ${currentServerCode}` : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
}

