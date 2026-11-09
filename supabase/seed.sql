-- Seed Legacy BeyondLimits Data into Supabase
-- User Profiles for Bharath CD & Bharath R
INSERT INTO public.users_profile (id, clerk_user_id, email, full_name, short_name, role_title, motto)
VALUES
('a0000000-0000-0000-0000-000000000001', 'legacy_bharath_cd', 'cdbharath234@gmail.com', 'Bharath CD', 'CD', 'Accountability Partner A', 'Discipline over impulse. Zero excuses.'),
('a0000000-0000-0000-0000-000000000002', 'legacy_bharath_r', 'bharath.r@example.com', 'Bharath R', 'BR', 'Accountability Partner B', 'Master the mind, master the day.')
ON CONFLICT (email) DO NOTHING;

-- Accountability Pair
INSERT INTO public.accountability_pairs (user_a_id, user_b_id, status)
VALUES ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'active')
ON CONFLICT (user_a_id, user_b_id) DO NOTHING;

-- Initial Streaks
INSERT INTO public.user_streaks (user_id, current_login_streak, longest_login_streak, current_clean_streak, longest_clean_streak, last_login_date)
VALUES
('a0000000-0000-0000-0000-000000000001', 11, 11, 11, 11, CURRENT_DATE),
('a0000000-0000-0000-0000-000000000002', 1, 6, 1, 6, CURRENT_DATE)
ON CONFLICT (user_id) DO NOTHING;

-- Historical Attendance Logs
INSERT INTO public.attendance_logs (user_id, date, relapsed, reason, trigger_category, emotion_state, urge_intensity, control_note)
VALUES
('a0000000-0000-0000-0000-000000000001', '2026-10-29', false, '', 'None', 'Focused', 2, 'Morning gym session and coding study kept mind occupied.'),
('a0000000-0000-0000-0000-000000000002', '2026-10-29', true, 'Stayed awake scrolling reels past 1:00 AM alone in room.', 'Late Night Phone Use', 'Bored / Restless', 8, 'Need to leave phone outside bedroom after 10:30 PM.'),
('a0000000-0000-0000-0000-000000000001', '2026-10-30', false, '', 'None', 'Calm', 3, 'Cold shower and evening walk.'),
('a0000000-0000-0000-0000-000000000002', '2026-10-30', false, '', 'None', 'Determined', 4, 'Kept phone on desk away from bed.'),
('a0000000-0000-0000-0000-000000000001', '2026-10-31', true, 'High exam & project stress led to procrastination in the afternoon.', 'Academic / Work Stress', 'Stressed / Anxious', 7, 'Work in library or shared study space when stressed.'),
('a0000000-0000-0000-0000-000000000002', '2026-10-31', false, '', 'None', 'Focused', 2, 'Completed full workout and read 20 pages.'),
('a0000000-0000-0000-0000-000000000001', '2026-11-01', false, '', 'None', 'Determined', 3, 'Reset mindset immediately and stayed busy.'),
('a0000000-0000-0000-0000-000000000002', '2026-11-01', false, '', 'None', 'Calm', 2, 'Early sleep schedule worked well.'),
('a0000000-0000-0000-0000-000000000001', '2026-11-02', false, '', 'None', 'Focused', 2, 'Productive day with zero idle browsing.'),
('a0000000-0000-0000-0000-000000000002', '2026-11-02', true, 'Unplanned idle weekend afternoon with no schedule.', 'Boredom / Idle Time', 'Lethargic', 7, 'Must plan weekend hours in advance.'),
('a0000000-0000-0000-0000-000000000001', '2026-11-03', false, '', 'None', 'Disciplined', 4, 'Did 50 pushups when urge hit.'),
('a0000000-0000-0000-0000-000000000002', '2026-11-03', false, '', 'None', 'Focused', 3, 'Checked in with Bharath CD in the evening.'),
('a0000000-0000-0000-0000-000000000001', '2026-11-04', false, '', 'None', 'Calm', 2, 'Strong routine maintained all day.'),
('a0000000-0000-0000-0000-000000000002', '2026-11-04', false, '', 'None', 'Disciplined', 2, 'Meditation for 10 mins before sleep.'),
('a0000000-0000-0000-0000-000000000001', '2026-11-05', false, '', 'None', 'Focused', 1, 'Zero social media triggers.'),
('a0000000-0000-0000-0000-000000000002', '2026-11-05', true, 'Triggered by social media explore feed late at night.', 'Social Media Trigger', 'Impulsive', 8, 'Installed app blocker after 10 PM.'),
('a0000000-0000-0000-0000-000000000001', '2026-11-06', false, '', 'None', 'Disciplined', 2, 'Stayed accountable and focused on project tasks.'),
('a0000000-0000-0000-0000-000000000002', '2026-11-06', false, '', 'None', 'Determined', 3, 'App blocker helped avoid late-night scrolling.'),
('a0000000-0000-0000-0000-000000000001', '2026-11-07', false, '', 'None', 'Calm', 2, 'Evening run and cold shower.'),
('a0000000-0000-0000-0000-000000000002', '2026-11-07', false, '', 'None', 'Focused', 2, 'Studied until 10 PM then slept directly.'),
('a0000000-0000-0000-0000-000000000001', '2026-11-08', false, '', 'None', 'Focused', 1, 'Full self-control maintained.'),
('a0000000-0000-0000-0000-000000000002', '2026-11-08', false, '', 'None', 'Calm', 2, 'Consistent routine and accountability call.')
ON CONFLICT (user_id, date) DO NOTHING;
