import { supabase } from './supabase';

export interface WorkoutCompletionInput {
  clerkUserId?: string;
  totalDurationSec: number;
  exercisesCompletedCount: number;
  skippedRestCount: number;
  restExtendedSeconds: number;
  exerciseDetails?: Array<{
    exerciseId: string;
    durationSec: number;
    completed: boolean;
  }>;
}

export interface UserStreaksResult {
  currentLoginStreak: number;
  longestLoginStreak: number;
  currentCleanStreak: number;
  longestCleanStreak: number;
  currentWorkoutStreak: number;
  longestWorkoutStreak: number;
}

/**
 * Get or create a user profile in Supabase by Clerk User ID or Email.
 */
export async function getOrCreateUserProfile(
  clerkUserId: string,
  email?: string,
  fullName?: string
): Promise<string> {
  // 1. Try finding by clerk_user_id
  const { data: existing, error } = await supabase
    .from('users_profile')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (existing?.id) {
    return existing.id;
  }

  // 2. If email provided, check if legacy seeded profile exists (e.g. Bharath CD)
  if (email) {
    const { data: legacyByEmail } = await supabase
      .from('users_profile')
      .select('id')
      .eq('email', email)
      .single();

    if (legacyByEmail?.id) {
      // Link the Clerk user ID to the legacy profile
      await supabase
        .from('users_profile')
        .update({ clerk_user_id: clerkUserId })
        .eq('id', legacyByEmail.id);
      return legacyByEmail.id;
    }
  }

  // 3. Insert new profile
  const newProfile = {
    clerk_user_id: clerkUserId,
    email: email || `${clerkUserId}@beyondlimits.app`,
    full_name: fullName || 'Discipline Athlete',
    short_name: (fullName || 'ME').slice(0, 2).toUpperCase(),
    role_title: 'Accountability Athlete',
    motto: 'Discipline over impulse.',
  };

  const { data: inserted, error: insertErr } = await supabase
    .from('users_profile')
    .insert(newProfile)
    .select('id')
    .single();

  if (insertErr || !inserted?.id) {
    // Fallback to default deterministic ID if network or policy constraint
    return 'a0000000-0000-0000-0000-000000000001';
  }

  return inserted.id;
}

/**
 * Record a completed workout session and update workout streak and challenge progression.
 */
export async function recordWorkoutSession(
  input: WorkoutCompletionInput
): Promise<{
  sessionId: string;
  workoutStreak: number;
  activeChallenges: any[];
}> {
  const profileId = input.clerkUserId
    ? await getOrCreateUserProfile(input.clerkUserId)
    : 'a0000000-0000-0000-0000-000000000001';

  // 1. Insert session
  const { data: session, error: sessErr } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: profileId,
      total_duration_sec: input.totalDurationSec,
      exercises_completed_count: input.exercisesCompletedCount,
      status: 'completed',
      skipped_rest_count: input.skippedRestCount,
      rest_extended_seconds: input.restExtendedSeconds,
      workout_date: new Date().toISOString().split('T')[0],
    })
    .select('id')
    .single();

  const sessionId = session?.id || 'local_session';

  // 2. Insert exercise logs if provided
  if (session?.id && input.exerciseDetails && input.exerciseDetails.length > 0) {
    const exerciseLogs = input.exerciseDetails.map((ex) => ({
      session_id: session.id,
      exercise_id: ex.exerciseId,
      actual_duration_sec: ex.durationSec,
      completed: ex.completed,
    }));

    await supabase.from('workout_exercise_logs').insert(exerciseLogs);
  }

  // 3. Fetch updated streak & active challenges
  const { data: streakRow } = await supabase
    .from('user_streaks')
    .select('current_workout_streak')
    .eq('user_id', profileId)
    .single();

  const { data: challenges } = await supabase
    .from('user_challenges')
    .select('challenge_id, current_progress_days, status, challenges_catalog(title, target_days, xp_reward)')
    .eq('user_id', profileId)
    .eq('status', 'active');

  return {
    sessionId,
    workoutStreak: streakRow?.current_workout_streak ?? 1,
    activeChallenges: challenges || [],
  };
}

/**
 * Synchronize attendance log to Supabase in the background.
 */
export async function syncAttendanceToSupabase(params: {
  friendId: 'bharath_cd' | 'bharath_r';
  date: string;
  relapsed: boolean;
  reason: string;
  triggerCategory: string;
  emotionState: string;
  urgeIntensity: number;
  controlNote: string;
}) {
  const userId =
    params.friendId === 'bharath_cd'
      ? 'a0000000-0000-0000-0000-000000000001'
      : 'a0000000-0000-0000-0000-000000000002';

  try {
    await supabase.from('attendance_logs').upsert(
      {
        user_id: userId,
        date: params.date,
        relapsed: params.relapsed,
        reason: params.reason || '',
        trigger_category: params.triggerCategory || 'None',
        emotion_state: params.emotionState || 'Focused',
        urge_intensity: params.urgeIntensity || 2,
        control_note: params.controlNote || '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' }
    );
  } catch (err) {
    console.error('Non-blocking Supabase sync error:', err);
  }
}

