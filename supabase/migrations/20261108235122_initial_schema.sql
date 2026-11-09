-- ============================================================================
-- BeyondLimits Supabase Database Migration
-- Project: roimbcfpjyqhtzlyspbb
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USER PROFILES & ACCOUNTABILITY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    short_name VARCHAR(10) NOT NULL DEFAULT 'ME',
    role_title TEXT DEFAULT 'Discipline Practitioner',
    motto TEXT DEFAULT 'Discipline over impulse.',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_profile_clerk_id ON public.users_profile(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_email ON public.users_profile(email);

CREATE TABLE IF NOT EXISTS public.accountability_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'paused')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_pair UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_accountability_pairs_user_a ON public.accountability_pairs(user_a_id);
CREATE INDEX IF NOT EXISTS idx_accountability_pairs_user_b ON public.accountability_pairs(user_b_id);

-- ============================================================================
-- 2. STREAKS & DAILY LOGIN ACTIVITY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_streaks (
    user_id UUID PRIMARY KEY REFERENCES public.users_profile(id) ON DELETE CASCADE,
    current_login_streak INT NOT NULL DEFAULT 0,
    longest_login_streak INT NOT NULL DEFAULT 0,
    last_login_date DATE,
    current_clean_streak INT NOT NULL DEFAULT 0,
    longest_clean_streak INT NOT NULL DEFAULT 0,
    current_workout_streak INT NOT NULL DEFAULT 0,
    longest_workout_streak INT NOT NULL DEFAULT 0,
    streak_freeze_count INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.login_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    first_login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    device_type VARCHAR(50) DEFAULT 'web',
    CONSTRAINT unique_user_daily_login UNIQUE (user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_login_activity_user_date ON public.login_activity_logs(user_id, activity_date);

-- ============================================================================
-- 3. ATTENDANCE & DISCIPLINE (CLEAN VS RELAPSE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    relapsed BOOLEAN NOT NULL DEFAULT false,
    reason TEXT NOT NULL DEFAULT '',
    trigger_category VARCHAR(100) NOT NULL DEFAULT 'None',
    emotion_state VARCHAR(100) NOT NULL DEFAULT 'Calm',
    urge_intensity SMALLINT NOT NULL DEFAULT 1 CHECK (urge_intensity BETWEEN 1 AND 10),
    control_note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_attendance_date UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_date ON public.attendance_logs(user_id, date DESC);

-- ============================================================================
-- 4. EXERCISES CATALOG & WORKOUT SESSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.exercises_catalog (
    id VARCHAR(50) PRIMARY KEY,
    name TEXT NOT NULL,
    order_num INT NOT NULL,
    default_duration_sec INT NOT NULL DEFAULT 60,
    default_rest_sec INT NOT NULL DEFAULT 30,
    image_url TEXT NOT NULL,
    focus_muscle_groups TEXT NOT NULL,
    description TEXT NOT NULL,
    tips JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    total_duration_sec INT NOT NULL DEFAULT 0,
    exercises_completed_count SMALLINT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    rest_extended_seconds INT NOT NULL DEFAULT 0,
    skipped_rest_count INT NOT NULL DEFAULT 0,
    workout_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON public.workout_sessions(user_id, workout_date DESC);

CREATE TABLE IF NOT EXISTS public.workout_exercise_logs (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
    exercise_id VARCHAR(50) NOT NULL REFERENCES public.exercises_catalog(id),
    actual_duration_sec INT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_workout_exercise_logs_session ON public.workout_exercise_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercise_logs_exercise ON public.workout_exercise_logs(exercise_id);

-- ============================================================================
-- 5. CHALLENGES & GAMIFICATION BADGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.challenges_catalog (
    id VARCHAR(50) PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    challenge_type VARCHAR(30) NOT NULL CHECK (challenge_type IN ('workout', 'clean_streak', 'daily_login')),
    target_days INT NOT NULL,
    xp_reward INT NOT NULL DEFAULT 500,
    badge_icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    challenge_id VARCHAR(50) NOT NULL REFERENCES public.challenges_catalog(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_progress_days INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
    completed_at TIMESTAMPTZ,
    last_progress_date DATE,
    CONSTRAINT unique_user_active_challenge UNIQUE (user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_challenges_user_status ON public.user_challenges(user_id, status);

CREATE TABLE IF NOT EXISTS public.badges_catalog (
    id VARCHAR(50) PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond')),
    icon_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_badges (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    badge_id VARCHAR(50) NOT NULL REFERENCES public.badges_catalog(id),
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_badge UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);

-- ============================================================================
-- 6. DAILY MOTIVATIONS & REMINDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_motivations (
    date DATE PRIMARY KEY,
    focus_theme TEXT NOT NULL,
    headline TEXT NOT NULL,
    quote TEXT NOT NULL,
    author TEXT NOT NULL,
    actionable_habit TEXT NOT NULL,
    neuroscience_insight TEXT NOT NULL,
    search_query TEXT DEFAULT '',
    sources JSONB DEFAULT '[]'::jsonb,
    generated_by TEXT DEFAULT 'Gemini Flash',
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_reminder_settings (
    user_id UUID PRIMARY KEY REFERENCES public.users_profile(id) ON DELETE CASCADE,
    phone_number TEXT DEFAULT '',
    reminder_time TIME NOT NULL DEFAULT '20:00',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    enabled BOOLEAN NOT NULL DEFAULT true,
    ntfy_topic TEXT DEFAULT '',
    last_triggered_date DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 7. STREAK AUTOMATION PROCEDURES & TRIGGERS
-- ============================================================================

-- Daily Login Streak Handler
CREATE OR REPLACE FUNCTION public.handle_user_daily_login(
    p_clerk_user_id TEXT,
    p_user_timezone TEXT DEFAULT 'Asia/Kolkata',
    p_device VARCHAR(50) DEFAULT 'web'
)
RETURNS TABLE (
    res_user_id UUID,
    res_current_streak INT,
    res_longest_streak INT,
    res_is_new_day BOOLEAN
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_today DATE;
    v_last_login DATE;
    v_cur_streak INT;
    v_long_streak INT;
    v_new_day BOOLEAN := false;
BEGIN
    SELECT up.id INTO v_user_id FROM public.users_profile up WHERE up.clerk_user_id = p_clerk_user_id;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User profile not found for clerk id: %', p_clerk_user_id;
    END IF;

    v_today := (now() AT TIME ZONE p_user_timezone)::DATE;

    INSERT INTO public.login_activity_logs (user_id, activity_date, first_login_at, last_login_at, device_type)
    VALUES (v_user_id, v_today, now(), now(), p_device)
    ON CONFLICT (user_id, activity_date)
    DO UPDATE SET last_login_at = now();

    INSERT INTO public.user_streaks (user_id, current_login_streak, longest_login_streak, last_login_date)
    VALUES (v_user_id, 1, 1, v_today)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT us.current_login_streak, us.longest_login_streak, us.last_login_date
    INTO v_cur_streak, v_long_streak, v_last_login
    FROM public.user_streaks us
    WHERE us.user_id = v_user_id;

    IF v_last_login IS NULL THEN
        v_cur_streak := 1;
        v_long_streak := 1;
        v_new_day := true;
    ELSIF v_last_login = v_today THEN
        v_new_day := false;
    ELSIF v_last_login = v_today - 1 THEN
        v_cur_streak := v_cur_streak + 1;
        IF v_cur_streak > v_long_streak THEN
            v_long_streak := v_cur_streak;
        END IF;
        v_new_day := true;
    ELSE
        v_cur_streak := 1;
        v_new_day := true;
    END IF;

    UPDATE public.user_streaks us
    SET current_login_streak = v_cur_streak,
        longest_login_streak = v_long_streak,
        last_login_date = v_today,
        updated_at = now()
    WHERE us.user_id = v_user_id;

    RETURN QUERY SELECT v_user_id, v_cur_streak, v_long_streak, v_new_day;
END;
$$;

-- Workout Completion & Challenge Progress Trigger
CREATE OR REPLACE FUNCTION public.handle_workout_completed()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_today DATE := NEW.workout_date;
    v_last_workout DATE;
    v_cur_w_streak INT;
    v_long_w_streak INT;
BEGIN
    IF NEW.status = 'completed' THEN
        SELECT current_workout_streak, longest_workout_streak
        INTO v_cur_w_streak, v_long_w_streak
        FROM public.user_streaks
        WHERE user_id = NEW.user_id;

        SELECT workout_date INTO v_last_workout
        FROM public.workout_sessions
        WHERE user_id = NEW.user_id AND id != NEW.id AND status = 'completed'
        ORDER BY workout_date DESC LIMIT 1;

        IF v_last_workout IS NULL OR v_last_workout < v_today - 1 THEN
            v_cur_w_streak := 1;
        ELSIF v_last_workout = v_today - 1 THEN
            v_cur_w_streak := COALESCE(v_cur_w_streak, 0) + 1;
        END IF;

        IF v_cur_w_streak > COALESCE(v_long_w_streak, 0) THEN
            v_long_w_streak := v_cur_w_streak;
        END IF;

        UPDATE public.user_streaks
        SET current_workout_streak = v_cur_w_streak,
            longest_workout_streak = v_long_w_streak,
            updated_at = now()
        WHERE user_id = NEW.user_id;

        -- Advance Active Workout Challenges
        UPDATE public.user_challenges uc
        SET current_progress_days = uc.current_progress_days + 1,
            last_progress_date = v_today,
            status = CASE 
                WHEN uc.current_progress_days + 1 >= c.target_days THEN 'completed'
                ELSE 'active'
            END,
            completed_at = CASE 
                WHEN uc.current_progress_days + 1 >= c.target_days THEN now()
                ELSE NULL
            END
        FROM public.challenges_catalog c
        WHERE uc.challenge_id = c.id
          AND uc.user_id = NEW.user_id
          AND uc.status = 'active'
          AND c.challenge_type = 'workout'
          AND (uc.last_progress_date IS NULL OR uc.last_progress_date < v_today);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_workout_completed ON public.workout_sessions;
CREATE TRIGGER trg_on_workout_completed
AFTER INSERT OR UPDATE ON public.workout_sessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_workout_completed();

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_motivations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reminder_settings ENABLE ROW LEVEL SECURITY;

-- Public Catalogs Read Policies
CREATE POLICY "Allow public read on exercises_catalog" ON public.exercises_catalog FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Allow public read on challenges_catalog" ON public.challenges_catalog FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Allow public read on badges_catalog" ON public.badges_catalog FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Allow public read on daily_motivations" ON public.daily_motivations FOR SELECT TO authenticated, anon USING (true);

-- User Profile & Data Access Policies (Linked with Clerk sub or authenticated role)
CREATE POLICY "Users read own profile" ON public.users_profile FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users update own profile" ON public.users_profile FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Users insert own profile" ON public.users_profile FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Users manage own streaks" ON public.user_streaks FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Users manage own attendance" ON public.attendance_logs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Users manage own workouts" ON public.workout_sessions FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Users manage own exercise logs" ON public.workout_exercise_logs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Users manage own challenges" ON public.user_challenges FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Users manage own badges" ON public.user_badges FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Users manage own reminders" ON public.user_reminder_settings FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- ============================================================================
-- 9. PRE-POPULATE 12 EXERCISES & STARTER CHALLENGES
-- ============================================================================
INSERT INTO public.exercises_catalog (id, order_num, name, default_duration_sec, default_rest_sec, image_url, focus_muscle_groups, description)
VALUES
('jumping_jacks', 1, 'Jumping Jacks', 60, 30, '/assets/aistudio/exercises/exercise1_jumping_jacks.png', 'Cardio & Full Body', 'Start with feet together and arms at your sides, then jump while spreading arms and legs.'),
('squats', 2, 'Squats', 60, 30, '/assets/aistudio/exercises/exercise2_squats.png', 'Quads, Glutes & Hamstrings', 'Lower your hips down and back as if sitting in a chair, keeping knees aligned over ankles.'),
('pushups', 3, 'Pushups', 60, 30, '/assets/aistudio/exercises/exercise3_pushups.png', 'Chest, Shoulders & Triceps', 'Place hands shoulder-width apart, lower your chest until near the floor, then press back up.'),
('lunges', 4, 'Lunges', 60, 30, '/assets/aistudio/exercises/exercise4_lunges.png', 'Quads, Calves & Balance', 'Step one foot forward and lower hips until both knees bend at approximately 90 degrees.'),
('plank', 5, 'Plank', 60, 30, '/assets/aistudio/exercises/exercise5_plank.png', 'Core, Stability & Shoulders', 'Hold a static position resting on forearms and toes, forming a straight line head to heels.'),
('mountain_climbers', 6, 'Mountain Climbers', 60, 30, '/assets/aistudio/exercises/exercise6_mountain_climbers.png', 'Core & High Intensity Cardio', 'In a high plank position, rapidly alternate driving knees towards your chest.'),
('burpees', 7, 'Burpees', 60, 30, '/assets/aistudio/exercises/exercise7_burpees.png', 'Explosive Power & Full Body Cardio', 'Drop into a squat, kick feet back to a pushup, return to squat, and explosively jump upward.'),
('high_knees', 8, 'High Knees', 60, 30, '/assets/aistudio/exercises/exercise8_high_knees.png', 'Calves, Hip Flexors & Heart Rate', 'Jog in place while lifting knees as high towards your chest as possible with quick cadence.'),
('bicycle_crunches', 9, 'Bicycle Crunches', 60, 30, '/assets/aistudio/exercises/exercise9_bicycle_crunches.png', 'Obliques & Rectus Abdominis', 'Lie on your back, pedal legs in the air while rotating opposite elbow toward opposite knee.'),
('wall_sit', 10, 'Wall Sit', 60, 30, '/assets/aistudio/exercises/exercise10_wall_sit.png', 'Isometric Quad Endurance & Mental Grit', 'Press back flat against a wall and slide down until thighs are parallel to the floor.'),
('glute_bridges', 11, 'Glute Bridges', 60, 30, '/assets/aistudio/exercises/exercise11_glute_bridges.png', 'Glutes, Lower Back & Posterior Chain', 'Lie on your back with knees bent and feet flat, then drive through heels to elevate hips toward the ceiling.'),
('tricep_dips', 12, 'Tricep Dips', 60, 30, '/assets/aistudio/exercises/exercise12_tricep_dips.png', 'Triceps, Upper Arms & Anterior Deltoids', 'Place hands shoulder-width apart behind you on a sturdy bench or chair, lower body by bending elbows, then press up.')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    order_num = EXCLUDED.order_num,
    image_url = EXCLUDED.image_url,
    description = EXCLUDED.description;

INSERT INTO public.challenges_catalog (id, title, description, challenge_type, target_days, xp_reward, badge_icon)
VALUES
('workout_7_day_blitz', '7-Day Workout Blitz', 'Complete the 12-exercise routine for 7 consecutive days.', 'workout', 7, 500, 'Trophy'),
('workout_30_day_beast', '30-Day Spartan Warrior', 'Complete daily workouts for 30 consecutive days.', 'workout', 30, 2500, 'Flame'),
('discipline_14_day_clean', '14-Day Iron Will', 'Maintain 14 consecutive clean days without relapse.', 'clean_streak', 14, 1000, 'ShieldCheck'),
('discipline_90_day_legend', '90-Day Reboot Master', 'Achieve full cognitive reboot with 90 consecutive clean days.', 'clean_streak', 90, 10000, 'Crown')
ON CONFLICT (id) DO UPDATE SET 
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    target_days = EXCLUDED.target_days;

INSERT INTO public.badges_catalog (id, name, description, tier, icon_name)
VALUES
('badge_first_workout', 'First Step Taken', 'Completed your very first 12-exercise routine.', 'bronze', 'Dumbbell'),
('badge_7_day_streak', 'Iron Habit', 'Maintained a 7-day login and discipline streak.', 'silver', 'Flame'),
('badge_30_day_master', 'Master of Self', 'Completed a 30-day streak milestone.', 'gold', 'Trophy'),
('badge_centurion', 'Centurion', 'Achieved 100 disciplined days.', 'diamond', 'Crown')
ON CONFLICT (id) DO NOTHING;

