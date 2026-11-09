export const ALLOWED_ADMIN_TABLES = [
  'users_profile',
  'attendance_logs',
  'workout_sessions',
  'workout_exercise_logs',
  'user_streaks',
  'login_activity_logs',
  'exercises_catalog',
  'challenges_catalog',
  'user_challenges',
  'badges_catalog',
  'user_badges',
  'daily_motivations',
  'user_reminder_settings',
] as const;

export type AdminTableName = (typeof ALLOWED_ADMIN_TABLES)[number];
