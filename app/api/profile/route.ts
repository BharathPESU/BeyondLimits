import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const meta = (user?.unsafeMetadata || {}) as Record<string, unknown>;

    return NextResponse.json({
      profile: {
        userId,
        name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.fullName || 'Athlete',
        email: user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '',
        imageUrl: user?.imageUrl || '',
        age: meta.age || '',
        dateOfBirth: meta.dateOfBirth || '',
        bloodGroup: meta.bloodGroup || '',
        height: meta.height || '',
        place: meta.place || '',
        geminiApiKey: meta.geminiApiKey || '',
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Failed to fetch user profile';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, age, dateOfBirth, bloodGroup, height, place, geminiApiKey } = body;

    const trimmedName = String(name || '').trim();
    const nameParts = trimmedName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // 1. Update Clerk user profile & metadata
    try {
      const client = await clerkClient();
      await client.users.updateUser(userId, {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        unsafeMetadata: {
          age: age || '',
          dateOfBirth: dateOfBirth || '',
          bloodGroup: bloodGroup || '',
          height: height || '',
          place: place || '',
          geminiApiKey: geminiApiKey || '',
        },
      });
    } catch (clerkErr) {
      console.warn('Clerk user metadata update warning:', clerkErr);
    }

    // 2. Best-effort sync to Supabase users_profile
    try {
      if (trimmedName) {
        await supabase
          .from('users_profile')
          .update({
            full_name: trimmedName,
            updated_at: new Date().toISOString(),
          })
          .eq('clerk_user_id', userId);
      }
    } catch {
      // Ignore Supabase network or schema constraints
    }

    return NextResponse.json({
      success: true,
      profile: {
        name: trimmedName,
        age,
        dateOfBirth,
        bloodGroup,
        height,
        place,
        geminiApiKey,
      },
      message: 'Profile updated successfully!',
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Failed to update user profile';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
