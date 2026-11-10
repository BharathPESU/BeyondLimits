import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { getDashboardPayload, getUserChatHistory, saveUserChatHistory } from '@/lib/db';
import {
  DATABASE_SCHEMA_DESCRIPTION,
  queryUserAttendanceByDate,
  queryUserAttendanceRange,
  queryUserRelapseInsights,
  queryUserWorkoutUpdates,
  queryUserAchievements,
  queryUserProfileDetails,
} from '@/lib/agent-database-service';
import { getEvolvedAgentSystemPrompt } from '@/lib/agent-prompt-evolution';
import { MotivationalChatMessage } from '@/lib/types';

export const dynamic = 'force-dynamic';

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
  agentMode: z.boolean().optional().default(false),
  userName: z.string().optional(),
});

function enforceMax480Chars(text: string): string {
  const cleaned = text
    .replace(/[*#_`~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= 475) {
    return cleaned;
  }

  const sliced = cleaned.slice(0, 470);
  const lastPeriod = Math.max(
    sliced.lastIndexOf('.'),
    sliced.lastIndexOf('!'),
    sliced.lastIndexOf('?')
  );

  if (lastPeriod > 200) {
    return sliced.slice(0, lastPeriod + 1).trim();
  }

  const lastSpace = sliced.lastIndexOf(' ');
  return `${sliced.slice(0, lastSpace > 200 ? lastSpace : 465).trim()}...`;
}

/**
 * Intelligent helper to extract date references from natural language
 */
function detectDateInQuery(message: string): string | null {
  const lower = message.toLowerCase();

  if (lower.includes('today')) {
    return 'today';
  }
  if (lower.includes('yesterday')) {
    return 'yesterday';
  }

  // Matches YYYY-MM-DD
  const isoMatch = lower.match(/\b(\d{4}-\d{1,2}-\d{1,2})\b/);
  if (isoMatch) return isoMatch[1];

  // Matches e.g. "nov 5", "november 5", "5 nov", "nov 5th"
  const months = [
    'january|jan',
    'february|feb',
    'march|mar',
    'april|apr',
    'may',
    'june|jun',
    'july|jul',
    'august|aug',
    'september|sep|sept',
    'october|oct',
    'november|nov',
    'december|dec',
  ];

  for (let mIdx = 0; mIdx < months.length; mIdx++) {
    const mPattern = months[mIdx];
    const regex1 = new RegExp(`(?:${mPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?`, 'i');
    const match1 = lower.match(regex1);
    if (match1) {
      const day = match1[1].padStart(2, '0');
      const month = String(mIdx + 1).padStart(2, '0');
      const year = new Date().getFullYear();
      return `${year}-${month}-${day}`;
    }

    const regex2 = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:${mPattern})`, 'i');
    const match2 = lower.match(regex2);
    if (match2) {
      const day = match2[1].padStart(2, '0');
      const month = String(mIdx + 1).padStart(2, '0');
      const year = new Date().getFullYear();
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

export async function GET() {
  try {
    const history = getUserChatHistory('default');
    return NextResponse.json({ history }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ history: [] }, { status: 200 });
  }
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

    const { message, history, agentMode, userName: customUserName } = parsed.data;
    const userApiKey =
      request.headers.get('x-gemini-api-key')?.trim() ||
      (typeof body === 'object' && body !== null && 'userApiKey' in body
        ? String(body.userApiKey).trim()
        : '');
    const serverApiKey = process.env.GEMINI_API_KEY?.trim();

    const dashboard = getDashboardPayload();
    const athleteName = customUserName || dashboard.userStats.userName || 'Bharath';
    const uStats = dashboard.userStats;

    // Build multi-turn conversational transcript memory
    const recentHistoryText = history
      .slice(-8)
      .map((h) => `[${h.role === 'user' ? athleteName : 'JARVIS Agent'}]: ${h.content}`)
      .join('\n');

    let dbQueryDetails: {
      queryType?: string;
      targetDate?: string;
      table?: string;
      summary?: string;
    } | undefined = undefined;

    let databaseContext = '';
    let systemInstruction = '';

    if (agentMode) {
      // 1. Synthesize Evolving System Prompt with Moral & Behavioral Directives
      const evolvedProfile = getEvolvedAgentSystemPrompt(athleteName);
      systemInstruction = evolvedProfile.systemInstruction;

      // 2. Intelligent Pre-Query based on User Question
      const lowerMsg = message.toLowerCase();
      const detectedDate = detectDateInQuery(message);

      if (
        detectedDate ||
        lowerMsg.includes('day') ||
        lowerMsg.includes('relapse') ||
        lowerMsg.includes('masturbat') ||
        lowerMsg.includes('slip')
      ) {
        const queryDate = detectedDate || 'today';
        const attendanceRes = await queryUserAttendanceByDate(queryDate);
        databaseContext += `\n[VERIFIED DATABASE RECORD: attendance_logs for ${attendanceRes.date}]\n${attendanceRes.summary}\n`;
        dbQueryDetails = {
          queryType: 'get_attendance_by_date',
          targetDate: attendanceRes.date,
          table: 'attendance_logs',
          summary: attendanceRes.summary,
        };
      }

      if (
        lowerMsg.includes('workout') ||
        lowerMsg.includes('exercise') ||
        lowerMsg.includes('routine') ||
        lowerMsg.includes('pushup') ||
        lowerMsg.includes('squat')
      ) {
        const workoutRes = await queryUserWorkoutUpdates();
        databaseContext += `\n[VERIFIED DATABASE RECORD: workout_sessions]\n${workoutRes.summary}\n`;
        if (!dbQueryDetails) {
          dbQueryDetails = {
            queryType: 'get_workout_and_exercise_updates',
            table: 'workout_sessions',
            summary: workoutRes.summary,
          };
        }
      }

      if (
        lowerMsg.includes('achievement') ||
        lowerMsg.includes('challenge') ||
        lowerMsg.includes('badge') ||
        lowerMsg.includes('missing') ||
        lowerMsg.includes('streak')
      ) {
        const achieveRes = await queryUserAchievements();
        databaseContext += `\n[VERIFIED DATABASE RECORD: challenges_catalog & badges_catalog]\n${achieveRes.summary}\n`;
        if (!dbQueryDetails) {
          dbQueryDetails = {
            queryType: 'get_achievements_and_challenges',
            table: 'user_challenges',
            summary: achieveRes.summary,
          };
        }
      }

      if (
        lowerMsg.includes('why') ||
        lowerMsg.includes('trigger') ||
        lowerMsg.includes('trap') ||
        lowerMsg.includes('lazy') ||
        lowerMsg.includes('stress') ||
        lowerMsg.includes('pattern')
      ) {
        const insightsRes = await queryUserRelapseInsights();
        databaseContext += `\n[VERIFIED DATABASE RECORD: relapse_patterns & triggers]\n${insightsRes.summary}\n`;
        if (!dbQueryDetails) {
          dbQueryDetails = {
            queryType: 'get_relapse_insights',
            table: 'attendance_logs (aggregated)',
            summary: insightsRes.summary,
          };
        }
      }

      if (!databaseContext) {
        // Fallback default snapshot for general queries
        databaseContext = `\n[VERIFIED DATABASE SNAPSHOT]\n- Current Clean Streak: ${uStats.currentStreak} days\n- Monthly Clean Rate: ${uStats.monthlyDisciplineRate}%\n- Total Days Marked: ${uStats.totalMarkedDays}\n`;
      }
    } else {
      // Standard Discipline Coach prompt
      systemInstruction = `You are the Iron-Will Discipline Coach & Mentor for ${athleteName}.
Core Directive:
1. Speak in a strong, commanding, stoic brotherly voice suitable for direct text-to-speech playback.
2. Answer the question directly AND forcefully connect it back to self-discipline, zero masturbation, and relentless ambition.
3. STRICT CHARACTER LIMIT: Your entire response MUST be under 480 characters. Plain spoken text only.`;
    }

    const finalPrompt = `Athlete Identity: ${athleteName}
Current Clean Streak: ${uStats.currentStreak} clean days
Monthly Self-Control Rate: ${uStats.monthlyDisciplineRate}%
${databaseContext ? `\nVerified Read-Only Database Fact:\n${databaseContext}` : ''}
${recentHistoryText ? `\n=== PREVIOUS CONVERSATION MEMORY ===\n${recentHistoryText}\n` : ''}
=== CURRENT ATHLETE QUESTION ===
${athleteName}: "${message}"

Directives for Response:
1. Address the athlete by name (${athleteName}) if natural.
2. Remember previous conversation context if the athlete is following up.
3. Directly answer their question using the verified database records above.
4. If they slipped/masturbated on the date in question, state the exact reason they logged, give strong moral grounding, and passionately build their confidence to conquer today.
5. If they asked about workout/achievements, state their exact streak and missing challenges.
6. STRICT CHARACTER LIMIT: Under 480 characters total. Spoken punchy sentences only.`;

    const generateWithKey = async (key: string): Promise<string> => {
      const ai = new GoogleGenAI({
        apiKey: key,
        apiVersion: 'v1beta',
        httpOptions: {
          headers: {
            'User-Agent': 'beyondlimits-agent',
          },
        },
      });

      // Cascade sequence: gemini-2.5-flash -> gemini-3.5-flash-lite -> gemini-3.8-flash
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: finalPrompt,
          config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 600,
          },
        });
        return response.text || '';
      } catch (err1) {
        console.warn('gemini-2.5-flash failed, attempting gemini-3.5-flash-lite:', err1);
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: finalPrompt,
            config: {
              systemInstruction,
              temperature: 0.7,
              maxOutputTokens: 600,
            },
          });
          return response.text || '';
        } catch (err2) {
          console.warn('gemini-3.5-flash-lite failed, attempting gemini-3.8-flash:', err2);
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: finalPrompt,
            config: {
              systemInstruction,
              temperature: 0.7,
              maxOutputTokens: 600,
            },
          });
          return response.text || '';
        }
      }
    };

    let rawReply = '';
    let keyProvider: 'user-gemini-key' | 'server-gemini-key' | 'deterministic-fallback' =
      'deterministic-fallback';

    // Step 1: User's personal Gemini API key
    if (userApiKey && userApiKey.length >= 10) {
      try {
        rawReply = await generateWithKey(userApiKey);
        if (rawReply) {
          keyProvider = 'user-gemini-key';
        }
      } catch (err) {
        console.warn('User Gemini API key failed, falling back to Vercel key:', err);
      }
    }

    // Step 2: Server-hosted Gemini API key on Vercel
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

    // Step 3: Deterministic high-impact fallback (only if both keys fail completely)
    if (!rawReply) {
      if (agentMode && dbQueryDetails) {
        rawReply = enforceMax480Chars(
          `Hey ${athleteName}, according to your database: ${dbQueryDetails.summary} Remember, every urge conquered builds unstoppable masculine power. Stand up, shake off weakness, and lead your day with honor!`
        );
      } else {
        rawReply = enforceMax480Chars(
          `Stay locked in, ${athleteName}! Regarding "${message.slice(0, 50)}": true discipline means conquering every urge and channeling your raw life-force into building your future. Master your mind today!`
        );
      }
      keyProvider = 'deterministic-fallback';
    }

    const finalReply = enforceMax480Chars(rawReply);

    // Save turn to SQLite/JSON backend chat history
    try {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newMessages: MotivationalChatMessage[] = [
        ...history.slice(-20).map((h, i) => ({
          id: `hist-${Date.now()}-${i}`,
          role: h.role,
          content: h.content,
          charCount: h.content.length,
          createdAt: nowStr,
        })),
        {
          id: `user-${Date.now()}`,
          role: 'user',
          content: message,
          charCount: message.length,
          createdAt: nowStr,
          agentMode,
        },
        {
          id: `agent-${Date.now()}`,
          role: 'assistant',
          content: finalReply,
          charCount: finalReply.length,
          createdAt: nowStr,
          agentMode,
          dbQueryDetails,
        },
      ];
      saveUserChatHistory('default', newMessages);
    } catch {}

    return NextResponse.json(
      {
        reply: finalReply,
        charCount: finalReply.length,
        agentMode,
        dbQueryDetails,
        systemPrompt: systemInstruction,
        provider: keyProvider,
      },
      { status: 200 }
    );
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : 'Failed to generate agent reply';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
