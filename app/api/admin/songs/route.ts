import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticatedRequest } from '@/lib/admin-auth';
import {
  getActiveMotivationalSongs,
  saveActiveMotivationalSongs,
} from '@/lib/admin-data-service';

export async function GET() {
  const songs = await getActiveMotivationalSongs();
  return NextResponse.json(songs);
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticatedRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
  }

  try {
    const songs = await request.json();
    if (!Array.isArray(songs) || songs.length === 0) {
      return NextResponse.json(
        { error: 'Invalid song list provided' },
        { status: 400 }
      );
    }

    const result = await saveActiveMotivationalSongs(songs);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${result.count} motivational tracks`,
      songs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
