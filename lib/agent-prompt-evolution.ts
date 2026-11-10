import { format } from 'date-fns';
import { getDb, getDashboardPayload } from './db';
import { DATABASE_SCHEMA_DESCRIPTION } from './agent-database-service';

export interface EvolvedAgentProfile {
  userName: string;
  cleanStreak: number;
  monthlyDisciplineRate: number;
  totalRelapses: number;
  detectedTraps: string[];
  moralDirectives: string[];
  systemInstruction: string;
  version: string;
}

/**
 * Dynamically synthesizes an evolving personalized system prompt by analyzing
 * the user's historical attendance records, relapse reasons, and emotional triggers.
 */
export function getEvolvedAgentSystemPrompt(customUserName?: string): EvolvedAgentProfile {
  const dashboard = getDashboardPayload();
  const { store } = getDb();
  const userName = customUserName || dashboard.userStats.userName || 'Bharath';
  const uStats = dashboard.userStats;

  const allLogs = store.attendanceLogs;
  const relapses = allLogs.filter((r) => r.relapsed);

  const detectedTraps: string[] = [];
  const moralDirectives: string[] = [];

  // Analyze triggers and emotions from actual database records
  const hasLazyTrap = relapses.some(
    (r) =>
      (r.triggerCategory && r.triggerCategory.toLowerCase().includes('lazy')) ||
      (r.triggerCategory && r.triggerCategory.toLowerCase().includes('room')) ||
      (r.emotionState && r.emotionState.toLowerCase().includes('lazy')) ||
      (r.reason && r.reason.toLowerCase().includes('lazy')) ||
      (r.reason && r.reason.toLowerCase().includes('room'))
  );

  const hasStressTrap = relapses.some(
    (r) =>
      (r.triggerCategory && r.triggerCategory.toLowerCase().includes('stress')) ||
      (r.emotionState && r.emotionState.toLowerCase().includes('stress')) ||
      (r.reason && r.reason.toLowerCase().includes('stress')) ||
      (r.reason && r.reason.toLowerCase().includes('overwhelm'))
  );

  const hasLateNightTrap = relapses.some(
    (r) =>
      (r.triggerCategory && r.triggerCategory.toLowerCase().includes('night')) ||
      (r.triggerCategory && r.triggerCategory.toLowerCase().includes('scrolling')) ||
      (r.reason && r.reason.toLowerCase().includes('night')) ||
      (r.reason && r.reason.toLowerCase().includes('reel'))
  );

  // Behavioral Traps Personalization
  if (hasLazyTrap || relapses.length === 0) {
    detectedTraps.push('Physical Laziness & Bedroom Confinement Trap');
    moralDirectives.push(
      `Whenever ${userName} is idle or lying in bed in his room, recognize this is his primary failure vector. Command immediate physical movement: leave the room, do 20 pushups, splash cold water, and break physical lethargy before it corrupts his spirit.`
    );
  }

  if (hasStressTrap) {
    detectedTraps.push('Stress Avoidance & Artificial Dopamine Escape Trap');
    moralDirectives.push(
      `When ${userName} feels stressed or overwhelmed, remind him that masturbating is a cowardly anesthetic that multiplies tomorrow's anxiety. Teach him to stand firm in discomfort and transmute raw tension into high-focus work.`
    );
  }

  if (hasLateNightTrap) {
    detectedTraps.push('Late-Night Device & Bed Scrolling Trap');
    moralDirectives.push(
      `Enforce the law of late-night discipline: Dock all phones outside the sleeping area by 10:30 PM. Isolation in the dark destroys self-control.`
    );
  }

  // Foundational Moral Principles
  moralDirectives.push(
    `MORAL FOUNDATION: Remind ${userName} of his sacred life-force. Masturbation robs a man of his ambition, clear eyes, and self-respect. Every conquered urge fuels real-world glory.`
  );
  moralDirectives.push(
    `CONFIDENCE INJECTION: If ${userName} asks about a day he slipped, state the exact date and reason recorded in the database honestly with zero sugarcoating. Then immediately instill fierce confidence: one slip does not define him; get up, claim victory today, and lead like a champion.`
  );
  moralDirectives.push(
    `STRICT AUDIO CONSTRAINT: Your reply must be under 480 characters total (including spaces and punctuation). Plain spoken English only, without bullet points, markdown bolding, or hashtags, perfectly optimized for natural voice synthesis.`
  );

  const systemInstruction = `You are JARVIS, ${userName}'s Personal Autonomous Discipline & Accountability Agent.
You have direct read-only access to ${userName}'s database (attendance records, workout sessions, streak metrics, and achievements).

=== REAL-TIME IDENTITY & ATHLETE STATS ===
- Athlete Name: ${userName}
- Current Clean Streak: ${uStats.currentStreak} clean days
- Longest Clean Streak: ${uStats.longestStreak} clean days
- Monthly Self-Control Rate: ${uStats.monthlyDisciplineRate}% (${uStats.monthlyCleanDays} clean days, ${uStats.monthlyRelapseDays} slips this month)

=== BEHAVIORAL VULNERABILITY DIRECTIVES (EVOLVING INTELLIGENCE) ===
${moralDirectives.map((d, i) => `${i + 1}. ${d}`).join('\n')}

=== DATABASE INTEGRATION & COMPILATION RULES ===
1. When asked about a specific date (e.g. "How was my day on 2026-11-05?"):
   - Inspect the database record for that date.
   - If he relapsed: state the exact reason recorded in the database, explain the moral consequence, and fiercely build his confidence to conquer today.
   - If clean: celebrate his focus, self-mastery, and streak progression.
   - If unmarked: state that no record was logged on that date and prompt him to log attendance.
2. When asked about exercise updates or achievements:
   - Provide his exact workout streak, exercises completed, active challenges, and missing badges based on the database.
3. READ-ONLY GUARANTEE: You only read data; you never modify or erase history.
4. STRICT CHARACTER LIMIT: Maximum 480 characters. Plain, spoken, punchy sentences suitable for live text-to-speech.`;

  return {
    userName,
    cleanStreak: uStats.currentStreak,
    monthlyDisciplineRate: uStats.monthlyDisciplineRate,
    totalRelapses: relapses.length,
    detectedTraps,
    moralDirectives,
    systemInstruction,
    version: `2.0-${format(new Date(), 'yyyyMMdd-HHmm')}`,
  };
}
