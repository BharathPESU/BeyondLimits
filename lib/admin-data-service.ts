import { supabase } from './supabase';
import { MOTIVATIONAL_SONGS, MotivationalSong } from './motivation-media-data';
import {
  WORKOUT_EXERCISES,
  WorkoutExercise,
  WorkoutRoutine,
  DEFAULT_WORKOUT_ROUTINES,
} from './workout-data';
import fs from 'fs';
import path from 'path';

export type { WorkoutRoutine };
export { DEFAULT_WORKOUT_ROUTINES };

const LOCAL_CACHE_DIR = path.join(process.cwd(), 'data');
const SONGS_CACHE_FILE = path.join(LOCAL_CACHE_DIR, 'admin_songs.json');
const WORKOUTS_CACHE_FILE = path.join(LOCAL_CACHE_DIR, 'admin_workouts.json');

function ensureCacheDir() {
  if (!fs.existsSync(LOCAL_CACHE_DIR)) {
    try {
      fs.mkdirSync(LOCAL_CACHE_DIR, { recursive: true });
    } catch {
      // Ignore in read-only environments
    }
  }
}

/**
 * Fetch active motivational songs: checks Supabase first, then local file cache, then static default.
 */
export async function getActiveMotivationalSongs(): Promise<MotivationalSong[]> {
  try {
    const { data, error } = await supabase
      .from('users_profile')
      .select('motto')
      .eq('clerk_user_id', 'beyondlimits_admin_songs')
      .single();

    if (!error && data?.motto) {
      const parsed = JSON.parse(data.motto);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fall back to cache or static
  }

  try {
    if (fs.existsSync(SONGS_CACHE_FILE)) {
      const fileData = fs.readFileSync(SONGS_CACHE_FILE, 'utf8');
      const parsed = JSON.parse(fileData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fall through
  }

  return MOTIVATIONAL_SONGS;
}

/**
 * Save updated motivational songs to Supabase & local cache.
 */
export async function saveActiveMotivationalSongs(
  songs: MotivationalSong[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // 1. Write local cache
    ensureCacheDir();
    try {
      fs.writeFileSync(SONGS_CACHE_FILE, JSON.stringify(songs, null, 2), 'utf8');
    } catch {
      // Ignore if read-only
    }

    // 2. Upsert to Supabase
    const { error } = await supabase.from('users_profile').upsert(
      {
        clerk_user_id: 'beyondlimits_admin_songs',
        email: 'admin-songs@beyondlimits.internal',
        full_name: 'BeyondLimits Songs Catalog',
        motto: JSON.stringify(songs),
      },
      { onConflict: 'clerk_user_id' }
    );

    if (error) {
      return { success: false, count: songs.length, error: error.message };
    }

    return { success: true, count: songs.length };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, count: songs.length, error: message };
  }
}

/**
 * Fetch all workout routines: checks Supabase, then local cache, then default routines.
 */
export async function getActiveWorkoutRoutines(): Promise<WorkoutRoutine[]> {
  try {
    const { data, error } = await supabase
      .from('users_profile')
      .select('motto')
      .eq('clerk_user_id', 'beyondlimits_admin_workouts')
      .single();

    if (!error && data?.motto) {
      const parsed = JSON.parse(data.motto);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fall through
  }

  try {
    if (fs.existsSync(WORKOUTS_CACHE_FILE)) {
      const fileData = fs.readFileSync(WORKOUTS_CACHE_FILE, 'utf8');
      const parsed = JSON.parse(fileData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fall through
  }

  return DEFAULT_WORKOUT_ROUTINES;
}

/**
 * Save updated workout routines to Supabase & local cache.
 */
export async function saveActiveWorkoutRoutines(
  routines: WorkoutRoutine[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    ensureCacheDir();
    try {
      fs.writeFileSync(WORKOUTS_CACHE_FILE, JSON.stringify(routines, null, 2), 'utf8');
    } catch {
      // Ignore if read-only
    }

    const { error } = await supabase.from('users_profile').upsert(
      {
        clerk_user_id: 'beyondlimits_admin_workouts',
        email: 'admin-workouts@beyondlimits.internal',
        full_name: 'BeyondLimits Workout Routines',
        motto: JSON.stringify(routines),
      },
      { onConflict: 'clerk_user_id' }
    );

    if (error) {
      return { success: false, count: routines.length, error: error.message };
    }

    return { success: true, count: routines.length };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, count: routines.length, error: message };
  }
}

/**
 * Supported Supabase tables for the Admin Database Explorer.
 */
import { ALLOWED_ADMIN_TABLES, AdminTableName } from './admin-constants';
export { ALLOWED_ADMIN_TABLES };
export type { AdminTableName };

/**
 * Query any Supabase table with search and pagination for the Admin Table Explorer.
 */
export async function querySupabaseTable(
  tableName: AdminTableName,
  options: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
  } = {}
): Promise<{
  rows: Record<string, unknown>[];
  totalCount: number;
  columns: string[];
  error?: string;
}> {
  if (!ALLOWED_ADMIN_TABLES.includes(tableName)) {
    return { rows: [], totalCount: 0, columns: [], error: 'Table not permitted' };
  }

  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(5, options.pageSize || 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    let query = supabase.from(tableName).select('*', { count: 'exact' });

    // Exclude internal admin config rows from users_profile viewer if inspecting real users
    if (tableName === 'users_profile') {
      query = query.not('clerk_user_id', 'like', 'beyondlimits_admin_%');
    }

    const { data, count, error } = await query.range(from, to);

    if (error) {
      return {
        rows: [],
        totalCount: 0,
        columns: [],
        error: error.message,
      };
    }

    const rows = (data || []) as Record<string, unknown>[];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      rows,
      totalCount: count ?? rows.length,
      columns,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { rows: [], totalCount: 0, columns: [], error: message };
  }
}

/**
 * Compute key application telemetry & stats for the Admin Overview.
 */
export async function getAdminAppTelemetry(): Promise<{
  totalUsers: number;
  totalWorkouts: number;
  totalAttendanceLogs: number;
  totalExercises: number;
  activeStreaksCount: number;
  recentUsers: Array<{
    id: string;
    fullName: string;
    email: string;
    createdAt: string;
    shortName: string;
  }>;
}> {
  try {
    const [usersRes, workoutsRes, attendanceRes, exercisesRes, streaksRes] = await Promise.all([
      supabase
        .from('users_profile')
        .select('id, full_name, email, short_name, created_at', { count: 'exact' })
        .not('clerk_user_id', 'like', 'beyondlimits_admin_%')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('workout_sessions').select('*', { count: 'exact', head: true }),
      supabase.from('attendance_logs').select('*', { count: 'exact', head: true }),
      supabase.from('exercises_catalog').select('*', { count: 'exact', head: true }),
      supabase.from('user_streaks').select('*', { count: 'exact', head: true }),
    ]);

    const recentUsers = (usersRes.data || []).map((u) => ({
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      createdAt: u.created_at,
      shortName: u.short_name || 'ME',
    }));

    return {
      totalUsers: usersRes.count ?? recentUsers.length,
      totalWorkouts: workoutsRes.count ?? 0,
      totalAttendanceLogs: attendanceRes.count ?? 0,
      totalExercises: exercisesRes.count ?? 12,
      activeStreaksCount: streaksRes.count ?? 0,
      recentUsers,
    };
  } catch {
    return {
      totalUsers: 0,
      totalWorkouts: 0,
      totalAttendanceLogs: 0,
      totalExercises: 12,
      activeStreaksCount: 0,
      recentUsers: [],
    };
  }
}
