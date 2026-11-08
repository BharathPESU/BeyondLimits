import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { getDailyTechNews, saveDailyTechNews } from '@/lib/db';
import { TechNewsItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface TavilyNewsResult {
  title?: string;
  url?: string;
  content?: string;
  published_date?: string;
}

const LIVE_QUERY_ROTATION = [
  'latest artificial intelligence breakthroughs LLM agents tech news today',
  'top AI startups semiconductors NVIDIA OpenAI Google DeepMind news today',
  'newest developer tools open source AI robotics cloud computing news',
  'cybersecurity quantum computing autonomous systems AI hardware breakthroughs',
  'generative AI enterprise software mobile chips tech industry headlines today',
];

function inferCategory(title: string, summary: string): string {
  const combined = `${title} ${summary}`.toLowerCase();
  if (/chip|gpu|nvidia|npu|silicon|hardware|amd|intel|tsmc/.test(combined)) {
    return 'Chips & Hardware';
  }
  if (/robot|autonomous|drone|humanoid|vehicle/.test(combined)) {
    return 'Robotics & Automation';
  }
  if (/open[- ]source|github|developer|code|coding|sdk|framework/.test(combined)) {
    return 'Dev & Open Source';
  }
  if (/cloud|datacenter|infra|server|security|quantum/.test(combined)) {
    return 'Cloud & Systems';
  }
  return 'AI & Frontier Tech';
}

function extractDomainSource(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return 'AI & Tech Wire';
  }
}

async function fetchLiveTechNewsFromTavily(
  searchQuery: string
): Promise<{ items: TechNewsItem[]; usedTavily: boolean }> {
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  if (!tavilyKey || tavilyKey === 'MY_TAVILY_API_KEY') {
    return { items: [], usedTavily: false };
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: searchQuery,
        topic: 'news',
        search_depth: 'basic',
        max_results: 8,
      }),
    });

    if (!response.ok) {
      return { items: [], usedTavily: false };
    }

    const data = (await response.json()) as {
      results?: TavilyNewsResult[];
    };

    const rawResults = (data.results || []).filter(
      (r) => r.title && r.url && (r.content || '').trim().length > 20
    );

    const items: TechNewsItem[] = rawResults.slice(0, 5).map((r, idx) => {
      const cleanTitle = (r.title || `AI & Tech Briefing #${idx + 1}`)
        .replace(/\s+/g, ' ')
        .trim();
      const rawContent = (r.content || '')
        .replace(/\s+/g, ' ')
        .trim();
      const cleanSummary =
        rawContent.length > 240
          ? `${rawContent.slice(0, 237).trim()}...`
          : rawContent;

      return {
        id: idx + 1,
        title: cleanTitle,
        category: inferCategory(cleanTitle, cleanSummary),
        summary: cleanSummary,
        source: extractDomainSource(r.url || ''),
        url: (r.url || 'https://news.ycombinator.com').trim(),
        publishedAt: r.published_date
          ? r.published_date.slice(0, 16)
          : 'Live 7:00 AM Feed',
      };
    });

    return {
      items,
      usedTavily: items.length > 0,
    };
  } catch {
    return { items: [], usedTavily: false };
  }
}

const CURATED_ROTATION_SETS: TechNewsItem[][] = [
  [
    {
      id: 1,
      title: 'Reasoning AI Models Achieve New Highs on Real-World Software Benchmarks',
      category: 'AI & Frontier Tech',
      summary:
        'Next-generation multimodal reasoning models now verify their own code and mathematical proofs before returning answers, cutting hallucinations across engineering workflows.',
      source: 'techcrunch.com',
      url: 'https://techcrunch.com/category/artificial-intelligence/',
      publishedAt: 'Live Tech Feed',
    },
    {
      id: 2,
      title: 'Ultra-Fast Edge AI Chips Bring Local Voice & Vision Agents to Smartphones',
      category: 'Chips & Hardware',
      summary:
        'New 3nm neural processors execute 50+ tokens per second directly on mobile devices without sending private voice data to the cloud.',
      source: 'theverge.com',
      url: 'https://www.theverge.com/ai-artificial-intelligence',
      publishedAt: 'Live Tech Feed',
    },
    {
      id: 3,
      title: 'Open-Source Coding Assistants Add Multi-File Refactoring & Test Generation',
      category: 'Dev & Open Source',
      summary:
        'Open-weights developer tools now index entire repositories in milliseconds, automating unit test generation and security patching.',
      source: 'arstechnica.com',
      url: 'https://arstechnica.com/information-technology/',
      publishedAt: 'Live Tech Feed',
    },
    {
      id: 4,
      title: 'Humanoid Warehouse & Lab Robots Learn Fine Motor Skills via Simulation',
      category: 'Robotics & Automation',
      summary:
        'Physics-accurate GPU simulations train general-purpose robots to handle delicate electronics and laboratory instruments autonomously.',
      source: 'technologyreview.com',
      url: 'https://www.technologyreview.com',
      publishedAt: 'Live Tech Feed',
    },
    {
      id: 5,
      title: 'Next-Gen Clean Energy Data Centers Power Large-Scale AI Compute Grids',
      category: 'Cloud & Systems',
      summary:
        'Cloud providers are pairing modular clean power with liquid-cooled racks to scale AI inference capacity sustainably.',
      source: 'wired.com',
      url: 'https://www.wired.com/category/artificial-intelligence/',
      publishedAt: 'Live Tech Feed',
    },
  ],
];

export async function GET() {
  try {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let record = getDailyTechNews(todayStr);

    // If Tavily is configured and today's record hasn't been fetched from live Tavily yet, auto-fetch once
    const tavilyKey = process.env.TAVILY_API_KEY?.trim();
    const isTavilyReady = Boolean(tavilyKey && tavilyKey !== 'MY_TAVILY_API_KEY');
    if (isTavilyReady && !record.generatedBy.includes('Tavily Live')) {
      const { items, usedTavily } = await fetchLiveTechNewsFromTavily(
        LIVE_QUERY_ROTATION[0]
      );
      if (usedTavily && items.length > 0) {
        record = saveDailyTechNews({
          date: todayStr,
          scheduledTime: '07:00',
          items,
          searchQuery: LIVE_QUERY_ROTATION[0],
          generatedBy: 'Tavily Live 7:00 AM AI & Tech Briefing',
        });
      }
    }

    return NextResponse.json({ news: record }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load daily AI & Tech news';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const refreshIndex =
      typeof body.refreshIndex === 'number'
        ? Math.abs(body.refreshIndex) % LIVE_QUERY_ROTATION.length
        : Math.floor(Math.random() * LIVE_QUERY_ROTATION.length);

    const customQuery =
      typeof body.query === 'string' && body.query.trim().length > 0
        ? body.query.trim()
        : LIVE_QUERY_ROTATION[refreshIndex];

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const { items, usedTavily } = await fetchLiveTechNewsFromTavily(customQuery);

    const finalItems =
      usedTavily && items.length > 0
        ? items
        : CURATED_ROTATION_SETS[0].map((item, idx) => ({
            ...item,
            id: idx + 1,
            publishedAt: `Refreshed ${format(new Date(), 'hh:mm a')}`,
          }));

    const saved = saveDailyTechNews({
      date: todayStr,
      scheduledTime: '07:00',
      items: finalItems,
      searchQuery: customQuery,
      generatedBy: usedTavily
        ? `Tavily Live AI & Tech Search (${format(new Date(), 'hh:mm a')})`
        : `Curated AI & Tech Feed (${format(new Date(), 'hh:mm a')} · Add TAVILY_API_KEY in Secrets for live web news)`,
    });

    return NextResponse.json({ news: saved, usedTavily }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to refresh AI & Tech news';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
