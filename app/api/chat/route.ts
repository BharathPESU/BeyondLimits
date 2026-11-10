import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { getDashboardPayload } from '@/lib/db';

export const dynamic = 'force-dynamic';

const MOTIVATIONAL_COACH_SYSTEM_PROMPT = `You are the Iron-Will Discipline Coach & Personal Self-Mastery Mentor.
Core Directive:
1. Every single time the user asks ANY question, shares a thought, or talks to you, answer their question directly AND forcefully connect it back to self-discipline, emotional control, zero masturbation/relapses, and relentless ambition.
2. Speak in a strong, commanding, stoic brotherly voice suitable for direct text-to-speech playback.
3. STRICT CHARACTER LIMIT: Your entire response MUST be under 500 characters (including spaces and punctuation). Never exceed 480 characters. No markdown bullet lists or hashtags—write punchy, spoken-word sentences.`;

const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Please enter or speak a message.').max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
});

function enforceMax500Chars(text: string): string {
  const cleaned = text
    .replace(/[*#_`~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= 495) {
    return cleaned;
  }

  const sliced = cleaned.slice(0, 490);
  const lastPeriod = Math.max(
    sliced.lastIndexOf('.'),
    sliced.lastIndexOf('!'),
    sliced.lastIndexOf('?')
  );

  if (lastPeriod > 220) {
    return sliced.slice(0, lastPeriod + 1).trim();
  }

  const lastSpace = sliced.lastIndexOf(' ');
  return `${sliced.slice(0, lastSpace > 200 ? lastSpace : 485).trim()}...`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = ChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid message' },
        { status: 400 }
      );
    }

    const { message, history } = parsed.data;
    const userApiKey =
      request.headers.get('x-gemini-api-key')?.trim() ||
      (typeof body === 'object' && body !== null && 'userApiKey' in body
        ? String(body.userApiKey).trim()
        : '');
    const serverApiKey = process.env.GEMINI_API_KEY?.trim();

    const dashboard = getDashboardPayload();
    const uStats = dashboard.userStats;

    const recentHistoryText = history
      .slice(-4)
      .map((h) => `${h.role === 'user' ? 'User' : 'Coach'}: ${h.content}`)
      .join('\n');

    const prompt = `Live Accountability Context:
- Current Clean Streak: ${uStats.currentStreak} clean days (${uStats.weeklyCleanDays} clean this week)
- Monthly Self-Control Rate: ${uStats.monthlyDisciplineRate}% (${uStats.monthlyCleanDays} clean days, ${uStats.monthlyRelapseDays} relapses this month)
- Longest Streak: ${uStats.longestStreak} clean days

${recentHistoryText ? `Recent Conversation:\n${recentHistoryText}\n\n` : ''}User's New Question / Statement: "${message}"

Respond directly to the user's question while motivating them fiercely to stay disciplined, focused, and relentless. Remember: strictly under 480 characters total, plain spoken text only.`;

    const generateWithKey = async (key: string): Promise<string> => {
      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'beyondlimits-chat',
          },
        },
      });

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction: MOTIVATIONAL_COACH_SYSTEM_PROMPT,
            temperature: 0.75,
          },
        });
        return response.text || '';
      } catch {
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
          config: {
            systemInstruction: MOTIVATIONAL_COACH_SYSTEM_PROMPT,
            temperature: 0.75,
          },
        });
        return response.text || '';
      }
    };

    let rawReply = '';
    let keyProvider: 'user-gemini-key' | 'server-gemini-key' | 'deterministic-fallback' =
      'deterministic-fallback';

    // Step 1: Attempt user's custom Gemini API key if provided
    if (userApiKey && userApiKey.startsWith('AIzaSy')) {
      try {
        rawReply = await generateWithKey(userApiKey);
        if (rawReply) {
          keyProvider = 'user-gemini-key';
        }
      } catch (err) {
        console.warn(
          'User Gemini API key failed, automatically falling back to Vercel hosted key:',
          err instanceof Error ? err.message : err
        );
      }
    }

    // Step 2: Fallback to server-hosted Gemini API key on Vercel
    if (!rawReply && serverApiKey && serverApiKey !== 'MY_GEMINI_API_KEY') {
      try {
        rawReply = await generateWithKey(serverApiKey);
        if (rawReply) {
          keyProvider = 'server-gemini-key';
        }
      } catch (err) {
        console.warn('Server Gemini API key failed:', err);
      }
    }

    // Step 3: Deterministic high-impact fallback if both keys are unavailable or fail
    if (!rawReply) {
      rawReply = enforceMax500Chars(
        `Stay locked in, brother! Regarding "${message.slice(0, 60)}": discipline is forged when you conquer every impulse and put 100% of your energy into building your future. Master your mind today, keep your streak clean, and never settle for weakness.`
      );
      keyProvider = 'deterministic-fallback';
    }

    const finalReply = enforceMax500Chars(rawReply);

    return NextResponse.json(
      {
        reply: finalReply,
        charCount: finalReply.length,
        systemPrompt: MOTIVATIONAL_COACH_SYSTEM_PROMPT,
        provider: keyProvider,
      },
      { status: 200 }
    );
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : 'Failed to generate AI coach reply';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
