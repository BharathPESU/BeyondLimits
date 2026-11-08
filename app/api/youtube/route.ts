import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    if (!query) {
      return NextResponse.json(
        { error: 'Missing search query parameter q' },
        { status: 400 }
      );
    }

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      query
    )}`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ videoIds: [] }, { status: 200 });
    }

    const html = await response.text();
    const matches = Array.from(
      html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)
    ).map((m) => m[1]);

    const uniqueIds = Array.from(new Set(matches)).slice(0, 5);

    return NextResponse.json(
      {
        query,
        videoIds: uniqueIds,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ videoIds: [] }, { status: 200 });
  }
}
