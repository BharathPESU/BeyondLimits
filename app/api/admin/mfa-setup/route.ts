import { NextRequest, NextResponse } from 'next/server';
import { formatSecretForDisplay, generateOtpAuthUri, verifyTOTP, generateTOTP } from '@/lib/totp';
import { verifyAdminSessionToken, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  // Only authenticated admins with a valid session can inspect MFA setup
  const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!(await verifyAdminSessionToken(adminToken))) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin session required.' },
      { status: 401 }
    );
  }

  const secret = (
    process.env.ADMIN_TOTP_SECRET || 'EMS4YSNFN5LHBDUHJOL4UTBI6CIRKIE6'
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
      'Open your Authenticator app (Google Authenticator or Microsoft Authenticator) on your phone.',
      'Tap "+" to add an account and select "Other".',
      'Select "Or enter code manually".',
      `Enter Account name: "BeyondLimits Admin".`,
      `Enter Secret key: "${secret}".`,
      'Tap Finish/Save. The app will generate a 6-digit rolling code every 30 seconds.',
    ],
  });
}

export async function POST(request: NextRequest) {
  // Only authenticated admins with a valid session can test TOTP synchronization
  const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!(await verifyAdminSessionToken(adminToken))) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin session required.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { code } = body;
    const secret = (
      process.env.ADMIN_TOTP_SECRET || 'EMS4YSNFN5LHBDUHJOL4UTBI6CIRKIE6'
    ).trim();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: '6-digit code required' }, { status: 400 });
    }

    const valid = verifyTOTP(code, secret);

    return NextResponse.json({
      valid,
      message: valid ? 'Code verified successfully! Authenticator is in sync.' : 'Invalid code.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
}
