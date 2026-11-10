import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { format } from 'date-fns';
import { z } from 'zod';
import {
  getDailyMotivation,
  getDashboardPayload,
  saveDailyMotivation,
} from '@/lib/db';
import { MotivationSource } from '@/lib/types';

export const dynamic = 'force-dynamic';

const GenerateMotivationSchema = z.object({
  focusTheme: z
    .string()
    .optional()
    .default('Self-Discipline, Impulse Control & High-Achiever Success'),
  customSearchQuery: z.string().optional(),
});

interface TavilyResultItem {
  title?: string;
  url?: string;
  content?: string;
}

async function searchTavilyForMotivation(
  query: string
): Promise<{ sources: MotivationSource[]; usedTavily: boolean }> {
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  if (!tavilyKey || tavilyKey === 'MY_TAVILY_API_KEY') {
    return { sources: [], usedTavily: false };
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyKey,
        query,
        search_depth: 'basic',
        include_answer: true,
        max_results: 4,
      }),
    });

    if (!response.ok) {
      return { sources: [], usedTavily: false };
    }

    const data = (await response.json()) as {
      results?: TavilyResultItem[];
    };

    const sources: MotivationSource[] = (data.results || [])
      .filter((r) => r.title && r.url)
      .slice(0, 4)
      .map((r) => ({
        title: (r.title || 'Success & Self-Discipline Insight').trim(),
        url: (r.url || '').trim(),
        snippet: (r.content || '').slice(0, 240).trim(),
      }));

    return { sources, usedTavily: sources.length > 0 };
  } catch {
    return { sources: [], usedTavily: false };
  }
}

export async function GET() {
  try {
    const motivation = getDailyMotivation();
    return NextResponse.json({ motivation }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch daily motivation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = GenerateMotivationSchema.safeParse(body);
    const focusTheme = parsed.success
      ? parsed.data.focusTheme
      : 'Self-Discipline, Impulse Control & High-Achiever Success';

    const dashboard = getDashboardPayload();
    const uStats = dashboard.userStats;
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const searchQuery =
      parsed.success && parsed.data.customSearchQuery?.trim()
        ? parsed.data.customSearchQuery.trim()
        : `best scientific self discipline motivation ${focusTheme} dopamine control success habits`;

    // Step 1: Perform live web search via Tavily API if configured
    const { sources: tavilySources, usedTavily } =
      await searchTavilyForMotivation(searchQuery);

    const fallbackSources: MotivationSource[] = [
      {
        title: 'Huberman Lab — Dopamine & Willpower Pathways (Anterior Mid-Cingulate Cortex)',
        url: 'https://www.hubermanlab.com/newsletter/tools-to-manage-dopamine-and-improve-motivation-and-drive',
        snippet:
          'Deliberately resisting short-term impulses strengthens the anterior mid-cingulate cortex, increasing tenacity and drive for long-term goals.',
      },
      {
        title: 'James Clear — The Secret to Self-Control & Environment Mastery',
        url: 'https://jamesclear.com/self-control',
        snippet:
          'High performers structure their environment so triggers are eliminated before willpower is depleted late at night.',
      },
    ];

    const activeSources = tavilySources.length > 0 ? tavilySources : fallbackSources;
    const webContextText = activeSources
      .map(
        (s, idx) =>
          `Source ${idx + 1}: ${s.title} (${s.url})\nSummary: ${s.snippet}`
      )
      .join('\n\n');

    // Step 2: Synthesize tailored daily motivation using Gemini API
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (!geminiKey || geminiKey === 'MY_GEMINI_API_KEY') {
      return NextResponse.json(
        {
          error:
            'GEMINI_API_KEY is not configured yet. Please check your API key in Settings > Secrets.',
        },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `You are an elite performance, stoic discipline, and neuroscience coach for an individual self-mastery practitioner.
They have made a strict commitment to eliminate masturbation/relapses, master their impulses, and channel their energy into ambitious goals.

Current Live Progress Context:
- Current Clean Streak: ${uStats.currentStreak}-day clean streak (${uStats.weeklyCleanDays} clean days this week, ${uStats.weeklyRelapseDays} relapses).
- Monthly Self-Control Rate: ${uStats.monthlyDisciplineRate}% (${uStats.monthlyCleanDays} clean days vs ${uStats.monthlyRelapseDays} relapses).
- Requested Focus Theme: ${focusTheme}

Web Search Context (from Tavily / Curated Research):
${webContextText}

Generate a high-impact daily motivation briefing in JSON format for today (${todayStr}) that inspires the practitioner to stay 100% clean today and mark their daily attendance.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'Deliver concise, practical, stoic and science-backed self-mastery motivation without fluff. Keep the headline under 16 words and actionable habit concrete.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: {
              type: Type.STRING,
              description:
                'Punchy daily discipline headline addressing their self-control pact and success.',
            },
            quote: {
              type: Type.STRING,
              description:
                'Powerful quote on self-mastery, willpower, or long-term success.',
            },
            author: {
              type: Type.STRING,
              description: 'Author or source of the quote.',
            },
            actionableHabit: {
              type: Type.STRING,
              description:
                'One concrete physical or mental rule for the user to execute today when an urge or emotional trigger appears.',
            },
            neuroscienceInsight: {
              type: Type.STRING,
              description:
                'Brief explanation of how resisting urges today rewires dopamine and drive for real-world success, referencing their current streaks.',
            },
          },
          required: [
            'headline',
            'quote',
            'author',
            'actionableHabit',
            'neuroscienceInsight',
          ],
        },
      },
    });

    const rawText = (response.text ?? '{}').trim();
    const generated = JSON.parse(rawText) as {
      headline?: string;
      quote?: string;
      author?: string;
      actionableHabit?: string;
      neuroscienceInsight?: string;
    };

    const saved = saveDailyMotivation({
      date: todayStr,
      focusTheme,
      headline:
        generated.headline ||
        'Discipline Today Builds Unstoppable Momentum Tomorrow',
      quote:
        generated.quote ||
        'He who conquers himself is the mightiest warrior.',
      author: generated.author || 'Confucius',
      actionableHabit:
        generated.actionableHabit ||
        'Leave your phone outside the bedroom before 10:00 PM and log your 8:00 PM attendance on time.',
      neuroscienceInsight:
        generated.neuroscienceInsight ||
        'Protecting your baseline dopamine strengthens prefrontal focus and willpower.',
      searchQuery,
      sources: activeSources,
      generatedBy: usedTavily
        ? 'Tavily Live Web Search + Gemini 3.8 Flash'
        : 'Gemini 3.8 Flash (Configure TAVILY_API_KEY in Secrets for live web citations)',
    });

    const updatedDashboard = getDashboardPayload();

    return NextResponse.json(
      {
        motivation: saved,
        dashboard: updatedDashboard,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to generate daily motivation via Tavily & Gemini';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
