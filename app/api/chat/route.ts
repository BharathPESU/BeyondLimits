import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import {
  getDashboardPayload,
  getUserChatHistory,
  saveUserChatHistory,
  saveUserFeelingRecord,
  getUserFeelingRecords,
} from '@/lib/db';
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
  userApiKey: z.string().optional(),
  userApiKeys: z.array(z.string()).optional(),
});

/**
 * Enforce strict conciseness: under 250 characters (max 280) for fast, natural TTS
 */
function enforceMax250Chars(text: string): string {
  const cleaned = text
    .replace(/[*#_`~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= 250) {
    return cleaned;
  }

  const sliced = cleaned.slice(0, 248);
  const lastPeriod = Math.max(
    sliced.lastIndexOf('.'),
    sliced.lastIndexOf('!'),
    sliced.lastIndexOf('?')
  );

  if (lastPeriod > 120) {
    return sliced.slice(0, lastPeriod + 1).trim();
  }

  const lastSpace = sliced.lastIndexOf(' ');
  return `${sliced.slice(0, lastSpace > 120 ? lastSpace : 240).trim()}...`;
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

    const regex2 = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:${mPattern})`, 'i');
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

/**
 * Detect feeling/mood keywords to log into SQLite/local memory
 */
function extractUserFeelingAndMood(message: string): { feeling: string; mood: string } | null {
  const lower = message.toLowerCase();
  const moodCategories = [
    { mood: 'stressed', words: ['stress', 'stressed', 'overwhelm', 'pressure', 'anxious', 'anxiety', 'panic', 'tension'] },
    { mood: 'lazy', words: ['lazy', 'lethargic', 'procrastinat', 'unmotivated', 'sluggish', 'couch', 'slack'] },
    { mood: 'fighting_urges', words: ['urge', 'urges', 'tempt', 'horny', 'slip', 'relapse', 'masturbat', 'choke', 'crave'] },
    { mood: 'tired', words: ['tired', 'exhaust', 'sleepy', 'fatigue', 'drained', 'burned out', 'low energy'] },
    { mood: 'confident', words: ['confident', 'strong', 'conquered', 'focused', 'great', 'unstoppable', 'good', 'happy', 'fire'] },
    { mood: 'down', words: ['sad', 'down', 'depress', 'lonely', 'guilty', 'ashamed', 'bad', 'miserable', 'loser'] },
  ];

  for (const cat of moodCategories) {
    if (cat.words.some((w) => lower.includes(w))) {
      return { feeling: message.slice(0, 150), mood: cat.mood };
    }
  }

  if (lower.includes('feel') || lower.includes('mood') || lower.includes('energy')) {
    return { feeling: message.slice(0, 150), mood: 'expressed_feeling' };
  }

  return null;
}

export async function GET() {
  try {
    const history = getUserChatHistory('default');
    const feelings = getUserFeelingRecords(10);
    return NextResponse.json({ history, feelings }, { status: 200 });
  } catch {
    return NextResponse.json({ history: [], feelings: [] }, { status: 200 });
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

    const {
      message,
      history,
      agentMode,
      userName: customUserName,
      userApiKey,
      userApiKeys,
    } = parsed.data;

    // Build candidate keys list from client round-robin rotation
    const candidateKeys: string[] = [];
    if (Array.isArray(userApiKeys)) {
      for (const k of userApiKeys) {
        if (typeof k === 'string' && k.trim().length >= 10 && !candidateKeys.includes(k.trim())) {
          candidateKeys.push(k.trim());
        }
      }
    }
    const singleKey =
      request.headers.get('x-gemini-api-key')?.trim() ||
      userApiKey?.trim() ||
      (typeof body === 'object' && body !== null && 'userApiKey' in body
        ? String(body.userApiKey).trim()
        : '');

    if (singleKey && singleKey.length >= 10 && !candidateKeys.includes(singleKey)) {
      candidateKeys.push(singleKey);
    }

    const serverApiKey = process.env.GEMINI_API_KEY?.trim();

    const dashboard = getDashboardPayload();
    const athleteName = customUserName || dashboard.userStats.userName || 'Bharath';
    const uStats = dashboard.userStats;

    // Detect and log feelings to local SQLite database
    const detectedMood = extractUserFeelingAndMood(message);
    if (detectedMood) {
      try {
        saveUserFeelingRecord({
          feeling: detectedMood.feeling,
          mood: detectedMood.mood,
          rawUserInput: message,
        });
      } catch {}
    }

    const recentFeelings = getUserFeelingRecords(4);
    const feelingsHistoryContext =
      recentFeelings.length > 0
        ? recentFeelings
            .map((f) => `- ${f.date} (${f.time}): [${f.mood}] "${f.feeling}"`)
            .join('\n')
        : '';

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
        const queryTarget = detectedDate || 'yesterday';
        const attRes = await queryUserAttendanceByDate(queryTarget);
        databaseContext += `\n[VERIFIED DATABASE RECORD: attendance_logs for "${queryTarget}"]\n${attRes.summary}\n`;
        dbQueryDetails = {
          queryType: 'get_attendance_by_date',
          targetDate: attRes.date,
          table: 'attendance_logs',
          summary: attRes.summary,
        };
      }

      if (
        lowerMsg.includes('workout') ||
        lowerMsg.includes('exercise') ||
        lowerMsg.includes('routine') ||
        lowerMsg.includes('gym')
      ) {
        const workoutRes = await queryUserWorkoutUpdates();
        databaseContext += `\n[VERIFIED DATABASE RECORD: user_workouts]\n${workoutRes.summary}\n`;
        if (!dbQueryDetails) {
          dbQueryDetails = {
            queryType: 'get_workout_routines',
            table: 'user_workouts',
            summary: workoutRes.summary,
          };
        }
      }

      if (
        lowerMsg.includes('achievement') ||
        lowerMsg.includes('badge') ||
        lowerMsg.includes('challenge') ||
        lowerMsg.includes('rank')
      ) {
        const achieveRes = await queryUserAchievements();
        databaseContext += `\n[VERIFIED DATABASE RECORD: user_challenges & achievements]\n${achieveRes.summary}\n`;
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
      systemInstruction = `You are JARVIS, the Iron-Will Discipline Coach & Mentor for ${athleteName}.
Core Directives:
1. Speak in a strong, commanding, stoic brotherly voice suitable for direct text-to-speech.
2. Directly answer the question with conviction and moral steel.
3. STRICT CHARACTER LIMIT: Your entire response MUST be under 250 characters (max 280). Plain spoken text only.`;
    }

    const finalPrompt = `Athlete Identity: ${athleteName}
Current Clean Streak: ${uStats.currentStreak} clean days
Monthly Self-Control Rate: ${uStats.monthlyDisciplineRate}%
${databaseContext ? `\nVerified Read-Only Database Fact:\n${databaseContext}` : ''}
${feelingsHistoryContext ? `\n=== RECENT ATHLETE FEELINGS & MOOD LOG ===\n${feelingsHistoryContext}\n` : ''}
${recentHistoryText ? `\n=== PREVIOUS CONVERSATION FLOW (MEMORY) ===\n${recentHistoryText}\n` : ''}
=== CURRENT ATHLETE QUESTION / MESSAGE ===
${athleteName}: "${message}"

Directives for Response:
1. Address the athlete by name (${athleteName}) if natural.
2. CONVERSATION FLOW: If continuing previous topic, smoothly refer back ('As we discussed...'), then answer the primary question directly.
3. If user shares how they feel (or answered a check-in), acknowledge their mood, explain why that feeling is their discipline training ground, and give immediate moral fire.
4. STRICT CHARACTER LIMIT: The entire response MUST be under 250 characters total (never exceed 280). 1 to 2 punchy, spoken sentences only.`;

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

      // Try valid models in priority order
      const candidateModels = [
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
      ];

      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: finalPrompt,
            config: {
              systemInstruction,
              temperature: 0.7,
              maxOutputTokens: 350,
            },
          });
          const text =
            response.text ||
            (response.candidates?.[0]?.content?.parts as Array<{ text?: string }> | undefined)
              ?.map((p) => p.text || '')
              .join('') ||
            '';
          if (text.trim()) {
            return text.trim();
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          // If quota exceeded or 429, rethrow so round-robin moves to next key immediately
          if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota exceeded')) {
            throw err;
          }
          console.warn(`Model ${model} failed:`, msg.slice(0, 80));
        }
      }
      return '';
    };

    let rawReply = '';
    let keyProvider = 'deterministic-fallback';

    // Step 1: Round-Robin Rotation across user's candidate Gemini API keys (up to 10 keys)
    if (candidateKeys.length > 0) {
      for (let i = 0; i < candidateKeys.length; i++) {
        const candidate = candidateKeys[i];
        try {
          rawReply = await generateWithKey(candidate);
          if (rawReply) {
            keyProvider = `user-gemini-key (Key #${i + 1} of ${candidateKeys.length})`;
            break;
          }
        } catch (err) {
          console.warn(`User Gemini API Key #${i + 1} failed or quota exhausted:`, err);
          // Failover to next key in round-robin sequence
        }
      }
    }

    // Step 2: Server-hosted Gemini API key fallback
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

    // Step 3: Concise deterministic fallback if all keys fail
    if (!rawReply) {
      if (agentMode && dbQueryDetails) {
        rawReply = enforceMax250Chars(
          `Hey ${athleteName}, your database shows: ${dbQueryDetails.summary} Every urge conquered builds masculine power. Stand up and lead today with honor!`
        );
      } else {
        rawReply = enforceMax250Chars(
          `Stay locked in, ${athleteName}! True discipline means conquering urges and channeling raw life-force into your ambitions. Master your mind today!`
        );
      }
      keyProvider = 'deterministic-fallback';
    }

    const finalReply = enforceMax250Chars(rawReply);

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
        savedFeeling: !!detectedMood,
      },
      { status: 200 }
    );
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : 'Failed to generate agent reply';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
