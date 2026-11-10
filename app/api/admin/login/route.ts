import { NextRequest, NextResponse } from 'next/server';
import { verifyTOTP } from '@/lib/totp';
import { signAdminSession, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, mfaCode } = body;

    const expectedUsername = (process.env.ADMIN_USERNAME || 'admin').trim();
    const expectedPassword = (process.env.ADMIN_PASSWORD || 'BeyondLimits@2026!').trim();
    const totpSecret = (
      process.env.ADMIN_TOTP_SECRET || 'EMS4YSNFN5LHBDUHJOL4UTBI6CIRKIE6'
    ).trim();

    // 1. Verify Username & Password
    if (
      !username ||
      !password ||
      username.trim() !== expectedUsername ||
      password.trim() !== expectedPassword
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin username or password.' },
        { status: 401 }
      );
    }

    // 2. Verify 6-digit MFA / TOTP code from Microsoft Authenticator
    if (!mfaCode || typeof mfaCode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Please enter the 6-digit code from Microsoft Authenticator.' },
        { status: 400 }
      );
    }

    const isTotpValid = verifyTOTP(mfaCode, totpSecret);
    if (!isTotpValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid 6-digit MFA code. Check your Microsoft Authenticator app and try again.',
        },
        { status: 401 }
      );
    }

    // 3. Issue signed admin session cookie
    const token = await signAdminSession(expectedUsername);

    const response = NextResponse.json({
      success: true,
      message: 'Admin authenticated successfully',
      redirectUrl: '/admin',
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: `Authentication failed: ${message}` },
      { status: 500 }
    );
  }
}
