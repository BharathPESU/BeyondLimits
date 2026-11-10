import { format, subDays, parseISO, isValid } from 'date-fns';
import { getDashboardPayload, getDb } from './db';
import { supabase } from './supabase';
import { WORKOUT_EXERCISES } from './workout-data';
import { AttendanceRecord } from './types';

/**
 * Complete Database Schema Description supplied to the Autonomous Discipline Agent.
 * Strict Constraint: Read-Only Access Only. No modifications permitted.
 */
export const DATABASE_SCHEMA_DESCRIPTION = `
=== BEYONDLIMITS DATABASE SCHEMA (READ-ONLY) ===

1. TABLE: attendance_logs
   Description: Daily tracking of user self-control and masturbation status.
   Columns:
   - id: integer (primary key)
   - date: string (YYYY-MM-DD, e.g. '2026-11-05')
   - relapsed: boolean (FALSE = Clean / Self-Controlled day; TRUE = Masturbated / Slipped)
   - reason: string (MANDATORY when relapsed=true. The exact user-logged reason explaining why they masturbated/slipped)
   - trigger_category: string (Context trigger: 'Boredom & lazy in room', 'Stress & overwhelm', 'Late night loneliness', 'Social media scrolling', 'Fatigue & bed scrolling', 'None')
   - emotion_state: string (Psychological state: 'Lazy', 'Stressed', 'Exhausted', 'Anxious', 'Angry', 'Focused', 'Confident')
   - urge_intensity: integer (1 to 10 scale of impulse intensity)
   - control_note: string (Additional thoughts, reflections, or countermeasures noted by user)
   - updated_at / logged_at: string (Timestamp)

2. TABLE: workout_sessions
   Description: History of completed physical workout sessions.
   Columns:
   - id: uuid / string
   - workout_date: string (YYYY-MM-DD)
   - total_duration_sec: integer (Total session duration in seconds, e.g. 720 for 12 minutes)
   - exercises_completed_count: integer (Number of exercises completed out of 12)
   - skipped_rest_count: integer (How many rest periods were skipped to increase intensity)
   - rest_extended_seconds: integer (Extra rest taken, if any)
   - status: string ('completed' | 'in_progress')

3. TABLE: workout_exercise_logs
   Description: Individual exercise records within a workout session.
   Columns:
   - session_id: uuid (Foreign key to workout_sessions)
   - exercise_id: string (e.g. 'jumping_jacks', 'squats', 'pushups', 'lunges', 'plank', 'mountain_climbers', 'burpees', 'high_knees', 'glute_bridge', 'bicycle_crunches', 'superman', 'stretches')
   - actual_duration_sec: integer (Duration spent on exercise, typically 60s)
   - completed: boolean (Whether user completed the full exercise)

4. TABLE: user_streaks
   Description: Key momentum streaks for the user.
   Columns:
   - current_clean_streak: integer (Consecutive days without masturbating)
   - longest_clean_streak: integer (All-time longest clean streak in days)
   - current_workout_streak: integer (Consecutive days of completed workouts)
   - longest_workout_streak: integer (All-time longest workout streak in days)
   - current_login_streak: integer (Consecutive active days)

5. TABLE: challenges_catalog & user_challenges
   Description: Milestone discipline challenges and user progress.
   Milestones:
   - 'workout_7_day_blitz': 7-Day Workout Blitz (Target: 7 days, Reward: 500 XP)
   - 'workout_30_day_beast': 30-Day Spartan Warrior (Target: 30 days, Reward: 2500 XP)
   - 'discipline_14_day_clean': 14-Day Iron Will (Target: 14 clean days, Reward: 1000 XP)
   - 'discipline_90_day_legend': 90-Day Reboot Master (Target: 90 clean days, Reward: 10000 XP)
   Columns in user_challenges:
   - challenge_id: string
   - current_progress_days: integer
   - status: string ('active' | 'completed' | 'missing')

6. TABLE: badges_catalog & user_badges
   Description: Unlocked achievement badges and locked milestones.
   Catalog:
   - 'badge_first_workout': 'First Step Taken' (Completed first 12-exercise routine)
   - 'badge_7_day_streak': 'Iron Habit' (7-day clean streak milestone)
   - 'badge_30_day_master': 'Master of Self' (30-day clean streak milestone)
   - 'badge_centurion': 'Centurion' (100 days of discipline)

7. TABLE: users_profile
   Description: Personal identity and biometric details.
   Columns:
   - full_name: string (e.g. 'Bharath')
   - motto: string (e.g. 'Discipline over impulse.')
   - age: string / integer
   - date_of_birth: string (YYYY-MM-DD)
   - blood_group: string (e.g. 'O+')
   - height: string (e.g. '178 cm')
   - place: string (e.g. 'Bengaluru')
`;

export interface AttendanceQueryResult {
  date: string;
  found: boolean;
  relapsed: boolean;
  status: 'clean' | 'relapsed' | 'unmarked';
  reason: string;
  triggerCategory: string;
  emotionState: string;
  urgeIntensity: number;
  controlNote: string;
  summary: string;
}

export interface RangeQueryResult {
  startDate: string;
  endDate: string;
  totalDays: number;
  markedDays: number;
  cleanDays: number;
  relapseDays: number;
  cleanRatePercentage: number;
  relapses: Array<{
    date: string;
    reason: string;
    triggerCategory: string;
    emotionState: string;
    urgeIntensity: number;
  }>;
  summary: string;
}

export interface RelapseInsightsResult {
  totalLoggedRelapses: number;
  cleanDays: number;
  totalMarkedDays: number;
  overallControlRate: number;
  topTriggers: Array<{ trigger: string; count: number }>;
  topEmotions: Array<{ emotion: string; count: number }>;
  averageUrgeIntensity: number;
  primaryVulnerability: string;
  recentRelapses: Array<{
    date: string;
    reason: string;
    trigger: string;
    emotion: string;
  }>;
  summary: string;
}

export interface WorkoutUpdatesResult {
  workoutStreak: number;
  totalCompletedSessions: number;
  totalExercisesCompleted: number;
  availableExercisesCount: number;
  routineExercises: Array<{
    order: number;
    id: string;
    name: string;
    focus: string;
    durationSeconds: number;
  }>;
  recentSessions: Array<{
    date: string;
    durationSec: number;
    exercisesCompleted: number;
    status: string;
  }>;
  summary: string;
}

export interface AchievementsResult {
  cleanStreak: number;
  longestCleanStreak: number;
  workoutStreak: number;
  activeChallenges: Array<{
    id: string;
    title: string;
    targetDays: number;
    currentProgressDays: number;
    remainingDays: number;
    status: string;
    xpReward: number;
  }>;
  completedChallenges: Array<{
    id: string;
    title: string;
  }>;
  missingChallenges: Array<{
    id: string;
    title: string;
    targetDays: number;
    reason: string;
  }>;
  unlockedBadges: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  missingBadges: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  summary: string;
}

/**
 * Normalizes input date strings (handles 'today', 'yesterday', 'YYYY-MM-DD', or natural formats)
 */
export function normalizeDateInput(rawDate: string): string {
  const trimmed = rawDate.trim().toLowerCase();
  const today = new Date();

  if (trimmed === 'today' || trimmed === 'now') {
    return format(today, 'yyyy-MM-dd');
  }
  if (trimmed === 'yesterday') {
    return format(subDays(today, 1), 'yyyy-MM-dd');
  }

  // Check direct YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Attempt parseISO
  try {
    const parsed = parseISO(trimmed);
    if (isValid(parsed)) {
      return format(parsed, 'yyyy-MM-dd');
    }
  } catch {}

  return format(today, 'yyyy-MM-dd');
}

/**
 * Safe Read-Only Query 1: Fetch user's attendance status for a specific date.
 */
export async function queryUserAttendanceByDate(
  rawDate: string
): Promise<AttendanceQueryResult> {
  const targetDate = normalizeDateInput(rawDate);
  const { store } = getDb();

  // 1. Check local JSON store records
  let record: AttendanceRecord | undefined = store.attendanceLogs.find(
    (r) => r.date === targetDate
  );

  // 2. Fallback check to Supabase if local was not found
  if (!record) {
    try {
      const { data } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('date', targetDate)
        .maybeSingle();

      if (data) {
        record = {
          id: data.id || 1,
          friendId: 'user',
          friendName: 'Athlete',
          date: data.date,
          relapsed: Boolean(data.relapsed),
          reason: data.reason || '',
          triggerCategory: data.trigger_category || 'None',
          emotionState: data.emotion_state || 'Focused',
          controlNote: data.control_note || '',
          urgeIntensity: data.urge_intensity || 2,
          updatedAt: data.updated_at || new Date().toISOString(),
        };
      }
    } catch {}
  }

  if (!record) {
    return {
      date: targetDate,
      found: false,
      relapsed: false,
      status: 'unmarked',
      reason: '',
      triggerCategory: 'None',
      emotionState: 'Unknown',
      urgeIntensity: 0,
      controlNote: '',
      summary: `No attendance record logged for date ${targetDate}. It was unmarked.`,
    };
  }

  const isRelapsed = record.relapsed;
  const reasonText = record.reason?.trim() || 'No explicit reason specified';
  const trigger = record.triggerCategory || 'Unspecified trigger';
  const emotion = record.emotionState || 'Unspecified emotion';

  const summary = isRelapsed
    ? `On ${targetDate}, the user experienced a relapse (masturbated). Reason recorded: "${reasonText}". Context Trigger: "${trigger}". Emotion State: "${emotion}". Urge Intensity: ${record.urgeIntensity}/10.`
    : `On ${targetDate}, the user maintained complete self-control (CLEAN). Zero relapses. State: ${emotion}, Urge: ${record.urgeIntensity}/10. Note: "${record.controlNote || 'Clean day'}".`;

  return {
    date: targetDate,
    found: true,
    relapsed: isRelapsed,
    status: isRelapsed ? 'relapsed' : 'clean',
    reason: isRelapsed ? reasonText : '',
    triggerCategory: trigger,
    emotionState: emotion,
    urgeIntensity: record.urgeIntensity || 2,
    controlNote: record.controlNote || '',
    summary,
  };
}

/**
 * Safe Read-Only Query 2: Fetch attendance across a date range.
 */
export async function queryUserAttendanceRange(
  startRaw: string,
  endRaw: string
): Promise<RangeQueryResult> {
  const startDate = normalizeDateInput(startRaw);
  const endDate = normalizeDateInput(endRaw);

  const { store } = getDb();
  const inRange = store.attendanceLogs.filter(
    (r) => r.date >= startDate && r.date <= endDate
  );

  const markedDays = inRange.length;
  const cleanDays = inRange.filter((r) => !r.relapsed).length;
  const relapseDays = inRange.filter((r) => r.relapsed).length;
  const cleanRate =
    markedDays > 0 ? Math.round((cleanDays / markedDays) * 100) : 100;

  const relapses = inRange
    .filter((r) => r.relapsed)
    .map((r) => ({
      date: r.date,
      reason: r.reason,
      triggerCategory: r.triggerCategory,
      emotionState: r.emotionState,
      urgeIntensity: r.urgeIntensity,
    }));

  const summary = `Date range ${startDate} to ${endDate}: ${markedDays} days marked. Clean days: ${cleanDays}, Relapse days: ${relapseDays}. Self-control rate: ${cleanRate}%. Relapses occurred on: ${
    relapses.map((rel) => `${rel.date} ("${rel.reason}")`).join('; ') || 'None (100% clean)'
  }.`;

  return {
    startDate,
    endDate,
    totalDays: markedDays,
    markedDays,
    cleanDays,
    relapseDays,
    cleanRatePercentage: cleanRate,
    relapses,
    summary,
  };
}

/**
 * Safe Read-Only Query 3: Analyze relapse triggers, patterns, and reasons.
 */
export async function queryUserRelapseInsights(): Promise<RelapseInsightsResult> {
  const { store } = getDb();
  const allLogs = store.attendanceLogs;
  const relapses = allLogs.filter((r) => r.relapsed);

  const triggerCounts: Record<string, number> = {};
  const emotionCounts: Record<string, number> = {};
  let totalUrge = 0;

  for (const rel of relapses) {
    const t = rel.triggerCategory || 'Uncategorized';
    triggerCounts[t] = (triggerCounts[t] || 0) + 1;

    const e = rel.emotionState || 'Unspecified';
    emotionCounts[e] = (emotionCounts[e] || 0) + 1;

    totalUrge += rel.urgeIntensity || 5;
  }

  const topTriggers = Object.entries(triggerCounts)
    .map(([trigger, count]) => ({ trigger, count }))
    .sort((a, b) => b.count - a.count);

  const topEmotions = Object.entries(emotionCounts)
    .map(([emotion, count]) => ({ emotion, count }))
    .sort((a, b) => b.count - a.count);

  const avgUrge =
    relapses.length > 0 ? Number((totalUrge / relapses.length).toFixed(1)) : 0;

  const markedCount = allLogs.length;
  const cleanCount = allLogs.filter((r) => !r.relapsed).length;
  const overallRate =
    markedCount > 0 ? Math.round((cleanCount / markedCount) * 100) : 100;

  // Determine primary vulnerability vector
  let primaryVulnerability = 'None detected. Flawless discipline.';
  if (topTriggers.length > 0 && topEmotions.length > 0) {
    const topT = topTriggers[0].trigger;
    const topE = topEmotions[0].emotion;
    primaryVulnerability = `High vulnerability occurs when feeling "${topE}" and triggered by "${topT}". The user retreats to idle bedroom isolation or scrolling to relieve discomfort.`;
  }

  const recentRelapses = relapses.slice(0, 5).map((r) => ({
    date: r.date,
    reason: r.reason,
    trigger: r.triggerCategory,
    emotion: r.emotionState,
  }));

  const summary = `Total logs: ${markedCount}. Clean days: ${cleanCount}. Total relapses: ${
    relapses.length
  } (${100 - overallRate}% relapse rate). Primary trigger: ${
    topTriggers[0]?.trigger || 'None'
  }. Primary emotional state: ${topEmotions[0]?.emotion || 'None'}. Average urge during slip: ${avgUrge}/10. ${primaryVulnerability}`;

  return {
    totalLoggedRelapses: relapses.length,
    cleanDays: cleanCount,
    totalMarkedDays: markedCount,
    overallControlRate: overallRate,
    topTriggers,
    topEmotions,
    averageUrgeIntensity: avgUrge,
    primaryVulnerability,
    recentRelapses,
    summary,
  };
}

/**
 * Safe Read-Only Query 4: Fetch exercise updates, workout sessions, and routine catalog.
 */
export async function queryUserWorkoutUpdates(): Promise<WorkoutUpdatesResult> {
  const dashboard = getDashboardPayload();
  const uStats = dashboard.userStats;

  // Try fetching recent workout sessions from Supabase
  let sessions: Array<{
    date: string;
    durationSec: number;
    exercisesCompleted: number;
    status: string;
  }> = [];

  try {
    const { data } = await supabase
      .from('workout_sessions')
      .select('workout_date, total_duration_sec, exercises_completed_count, status')
      .order('workout_date', { ascending: false })
      .limit(5);

    if (data && data.length > 0) {
      sessions = data.map((s) => ({
        date: s.workout_date,
        durationSec: s.total_duration_sec || 720,
        exercisesCompleted: s.exercises_completed_count || 12,
        status: s.status || 'completed',
      }));
    }
  } catch {}

  if (sessions.length === 0) {
    sessions = [
      {
        date: format(new Date(), 'yyyy-MM-dd'),
        durationSec: 720,
        exercisesCompleted: 12,
        status: 'completed',
      },
    ];
  }

  const routineExercises = WORKOUT_EXERCISES.map((ex) => ({
    order: ex.order,
    id: ex.id,
    name: ex.name,
    focus: ex.focus,
    durationSeconds: ex.durationSeconds,
  }));

  const summary = `Workout Streak: ${uStats.currentStreak} active days. Total routine exercises: ${WORKOUT_EXERCISES.length} exercises (60s each, 12 min total body circuit). Recent session: ${sessions[0].date} (${sessions[0].exercisesCompleted}/12 exercises completed).`;

  return {
    workoutStreak: uStats.currentStreak,
    totalCompletedSessions: sessions.length,
    totalExercisesCompleted: sessions.reduce(
      (acc, s) => acc + s.exercisesCompleted,
      0
    ),
    availableExercisesCount: WORKOUT_EXERCISES.length,
    routineExercises,
    recentSessions: sessions,
    summary,
  };
}

/**
 * Safe Read-Only Query 5: Fetch achievements, active challenges, and missing badges.
 */
export async function queryUserAchievements(): Promise<AchievementsResult> {
  const dashboard = getDashboardPayload();
  const uStats = dashboard.userStats;

  const cleanDays = uStats.currentStreak;
  const longestStreak = uStats.longestStreak;

  // Challenges
  const allChallenges = [
    {
      id: 'workout_7_day_blitz',
      title: '7-Day Workout Blitz',
      targetDays: 7,
      currentProgressDays: Math.min(cleanDays, 7),
      xpReward: 500,
    },
    {
      id: 'workout_30_day_beast',
      title: '30-Day Spartan Warrior',
      targetDays: 30,
      currentProgressDays: Math.min(cleanDays, 30),
      xpReward: 2500,
    },
    {
      id: 'discipline_14_day_clean',
      title: '14-Day Iron Will',
      targetDays: 14,
      currentProgressDays: Math.min(cleanDays, 14),
      xpReward: 1000,
    },
    {
      id: 'discipline_90_day_legend',
      title: '90-Day Reboot Master',
      targetDays: 90,
      currentProgressDays: Math.min(cleanDays, 90),
      xpReward: 10000,
    },
  ];

  const activeChallenges = allChallenges
    .filter((c) => c.currentProgressDays < c.targetDays)
    .map((c) => ({
      ...c,
      remainingDays: c.targetDays - c.currentProgressDays,
      status: 'active',
    }));

  const completedChallenges = allChallenges
    .filter((c) => c.currentProgressDays >= c.targetDays)
    .map((c) => ({ id: c.id, title: c.title }));

  const missingChallenges = allChallenges
    .filter((c) => c.currentProgressDays < c.targetDays)
    .map((c) => ({
      id: c.id,
      title: c.title,
      targetDays: c.targetDays,
      reason: `Requires ${c.targetDays - c.currentProgressDays} more consistent clean days to conquer.`,
    }));

  // Badges
  const allBadges = [
    {
      id: 'badge_first_workout',
      name: 'First Step Taken',
      description: 'Completed your very first 12-exercise routine.',
      unlocked: true,
    },
    {
      id: 'badge_7_day_streak',
      name: 'Iron Habit',
      description: 'Maintained a 7-day clean discipline streak.',
      unlocked: cleanDays >= 7,
    },
    {
      id: 'badge_30_day_master',
      name: 'Master of Self',
      description: 'Completed a 30-day streak milestone.',
      unlocked: cleanDays >= 30,
    },
    {
      id: 'badge_centurion',
      name: 'Centurion',
      description: 'Achieved 100 disciplined days.',
      unlocked: cleanDays >= 100,
    },
  ];

  const unlockedBadges = allBadges
    .filter((b) => b.unlocked)
    .map((b) => ({ id: b.id, name: b.name, description: b.description }));

  const missingBadges = allBadges
    .filter((b) => !b.unlocked)
    .map((b) => ({ id: b.id, name: b.name, description: b.description }));

  const summary = `Clean Streak: ${cleanDays} days (Longest: ${longestStreak}). Active Challenges: ${activeChallenges.length}. Completed Challenges: ${completedChallenges.length}. Unlocked Badges: ${unlockedBadges.length} (${unlockedBadges.map((b) => b.name).join(', ')}). Missing Badges: ${missingBadges.length} (${missingBadges.map((b) => b.name).join(', ')}).`;

  return {
    cleanStreak: cleanDays,
    longestCleanStreak: longestStreak,
    workoutStreak: cleanDays,
    activeChallenges,
    completedChallenges,
    missingChallenges,
    unlockedBadges,
    missingBadges,
    summary,
  };
}

/**
 * Safe Read-Only Query 6: Fetch user's profile details.
 */
export async function queryUserProfileDetails(): Promise<{
  name: string;
  motto: string;
  roleTitle: string;
  summary: string;
}> {
  const dashboard = getDashboardPayload();
  const userName = dashboard.userStats.userName || 'Bharath';

  return {
    name: userName,
    motto: 'Discipline over impulse. Zero excuses.',
    roleTitle: 'Accountability Athlete',
    summary: `Athlete Name: ${userName}. Role: Accountability Athlete. Motto: "Discipline over impulse. Zero excuses."`,
  };
}

/**
 * Master Safe Read-Only Query Dispatcher
 * Guarantees zero write/update/delete operations.
 */
export async function executeSafeReadOnlyQuery(
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<{
  toolName: string;
  success: boolean;
  data: unknown;
  summary: string;
}> {
  try {
    switch (toolName) {
      case 'get_attendance_by_date': {
        const dateArg = String(args.date || 'today');
        const res = await queryUserAttendanceByDate(dateArg);
        return {
          toolName,
          success: true,
          data: res,
          summary: res.summary,
        };
      }
      case 'get_attendance_range': {
        const start = String(args.start_date || args.startDate || 'today');
        const end = String(args.end_date || args.endDate || 'today');
        const res = await queryUserAttendanceRange(start, end);
        return {
          toolName,
          success: true,
          data: res,
          summary: res.summary,
        };
      }
      case 'get_relapse_insights': {
        const res = await queryUserRelapseInsights();
        return {
          toolName,
          success: true,
          data: res,
          summary: res.summary,
        };
      }
      case 'get_workout_and_exercise_updates': {
        const res = await queryUserWorkoutUpdates();
        return {
          toolName,
          success: true,
          data: res,
          summary: res.summary,
        };
      }
      case 'get_achievements_and_challenges': {
        const res = await queryUserAchievements();
        return {
          toolName,
          success: true,
          data: res,
          summary: res.summary,
        };
      }
      case 'get_user_profile': {
        const res = await queryUserProfileDetails();
        return {
          toolName,
          success: true,
          data: res,
          summary: res.summary,
        };
      }
      default: {
        return {
          toolName,
          success: false,
          data: null,
          summary: `Unknown tool "${toolName}". Only read-only queries are permitted.`,
        };
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      toolName,
      success: false,
      data: null,
      summary: `Failed to execute read-only query: ${message}`,
    };
  }
}
