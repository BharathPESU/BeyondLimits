import { NextResponse } from 'next/server';
import { getActiveMotivationalSongs } from '@/lib/admin-data-service';

export async function GET() {
  const songs = await getActiveMotivationalSongs();
  return NextResponse.json(songs, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
}

