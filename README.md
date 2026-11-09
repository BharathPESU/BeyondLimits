<p align="center">
  <img src="public/logo.png" alt="BeyondLimits Neon Lightning Logo" width="120" height="120" />
</p>

<h1 align="center">BeyondLimits</h1>

<p align="center">
  <strong>Strict Daily Self-Control Attendance, Guided 12-Exercise Workout Suites, and Habit Accountability Platform</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Clerk-Authentication-6C47FF?style=for-the-badge&logo=clerk" alt="Clerk Auth" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge" alt="MIT License" />
</p>

---

## 📌 Project Overview & Purpose

**BeyondLimits** is a comprehensive discipline, fitness, mental mastery, and habit accountability tracking platform designed for individuals and accountability duos (**Bharath CD & Bharath R**) to build unbreakable daily self-control, eliminate compulsive impulses, cultivate physical endurance, and track cognitive growth.

### The Core Problem It Solves
Traditional habit trackers allow passive checkbox ticking with zero friction or reflection. When relapses occur, users quietly abandon their streaks without understanding their cognitive triggers. 

**BeyondLimits enforces radical accountability:**
1. **Compulsory Relapse Logging**: If a relapse is marked, the user is required to record the trigger category, emotional state, urge intensity (1–10), and a detailed reflection explaining why it happened and how to prevent it.
2. **Integrated Guided Fitness**: Mental discipline and physical fitness are inseparable. A built-in 12-exercise voice-guided workout engine empowers users to substitute dopamine cravings with physical exertion.
3. **Duo Accountability & Gamification**: Designed for two accountability partners to compete side-by-side on weekly discipline rates, clean streaks, and challenge leaderboards.
4. **Zero-Bypass Security**: Protected by Clerk and Edge Middleware to ensure sessions and personal reflections are completely private.

---

## ✨ Features

### 1. 🛡️ Strict Daily Attendance & Self-Control Tracker
* **Clean vs. Relapse Logging**: Real-time logging of daily state.
* **Mandatory Reflection**: When marking a relapse, users must provide a root-cause explanation (minimum 3 characters), select a trigger category (*Late Night Phone Use*, *Academic Stress*, *Boredom*, *Social Media*), note emotional state (*Focused*, *Restless*, *Anxious*, *Lethargic*), and gauge urge intensity from 1 to 10.
* **Inline Editable Table**: Update past records, notes, and trigger categories directly within the dashboard table.

### 2. 🏋️ Guided 12-Exercise Workout Suite
* **Voice-Guided Workout Flow**: Web Speech API Text-to-Speech (TTS) voice announcements announce exercises: *"Ready to go, this is the next exercise..."*
* **12 Essential Exercises**: Jumping Jacks, Squats, Pushups, Lunges, Planks, Mountain Climbers, Burpees, High Knees, Bicycle Crunches, Wall Sits, Glute Bridges, and Tricep Dips.
* **Smart Intervals**: 60-second high-intensity exercise timers followed by 30-second rest periods.
* **Rest Controls**: Extend rest by `+10s` when exhausted or click `Skip` to jump directly into the next movement.
* **Visual Form Guides & Tips**: High-resolution exercise images at the top of the interface with modal popups for form cues and safety tips.
* **Completion Fanfare**: Audio synthesizer fanfare and celebratory stat cards upon completing all 12 exercises.

### 3. 🔐 Zero-Bypass Authentication & Security
* **Authentication Provider**: Powered by Clerk SDK (`@clerk/nextjs` v7).
* **Multi-Strategy Auth**: Supports **Email + Password**, **Continue with Google** OAuth, and self-service **Password Reset** ("Forgot Password?").
* **High-Contrast Clean White Theme**: Custom-crafted white theme card (`bg-white` on `bg-slate-50`) with high-contrast slate & emerald typography, eliminating all circular clipping or visual obstruction.
* **Zero-Bypass Route Protection**: Next.js Edge Middleware (`middleware.ts`) and Server Component guards (`app/page.tsx`) strictly block unauthenticated access to the dashboard and API routes.

### 4. ⚡ Dual-Database Architecture (Local + Cloud Supabase)
* **Local Offline Engine**: Resilient JSON/SQLite store (`data/discipline-tracker-store.json`) for zero-dependency local development and testing.
* **Cloud Supabase PostgreSQL**: Fully relational database (`roimbcfpjyqhtzlyspbb`) equipped with Row-Level Security (RLS), automated triggers, and stored procedures for streak calculation.

### 5. 📊 Analytics, Streaks & Comparison Leaderboard
* **Real-Time Streak Engine**: Tracks current login streaks, clean discipline streaks, and workout streaks alongside all-time records.
* **Weekly & Monthly Progress**: Calculates discipline percentage rates, clean-to-relapse ratios, trigger breakdown distributions, and weekly comparative leaderboards between partners.

### 6. 🧠 Daily AI Motivation & Neuroscience Insights
* **Gemini AI Synthesis**: Generates fresh daily focus themes, actionable habits, philosophical quotes, and neuroscience insights.
* **Live Web Research Citations**: Integrated with Tavily for grounding insights with scientific publications and articles.

### 7. 🔥 Three.js Fire & Voice-Reactive Visualizer
* **Interactive 3D Particle Canvas**: Real-time particle fire stage rendered with Three.js, pulsating in sync with audio frequency during motivation playback.

### 8. 📲 Multi-Channel Automated Reminders
* **Daily 8:00 PM Prompts**: Automated cron triggers delivering mobile push notifications via `ntfy.sh` and direct SMS via Twilio.

### 9. 📱 Progressive Web App (PWA)
* Fully installable on iOS, Android, macOS, and Windows with offline support and custom neon lightning app icons.

---

## 🗄️ Database Architecture & Schemas

The production database is hosted on **Supabase PostgreSQL** and structured across 14 normalized tables:

```
                            ┌─────────────────────┐
                            │    users_profile    │
                            └──────────┬──────────┘
                                       │ 1:1
                 ┌─────────────────────┼─────────────────────┐
                 │ 1:N                 │ 1:N                 │ 1:N
        ┌────────┴────────┐   ┌────────┴────────┐   ┌────────┴────────┐
        │ attendance_logs │   │   user_streaks  │   │ workout_sessions│
        └─────────────────┘   └─────────────────┘   └────────┬────────┘
                                                             │ 1:N
                                                    ┌────────┴────────┐
                                                    │ workout_exercise│
                                                    │     _logs       │
                                                    └─────────────────┘
```

### Table Reference

| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| **`users_profile`** | User account linked to Clerk | `id` (UUID), `clerk_user_id`, `email`, `full_name`, `short_name`, `timezone` |
| **`accountability_pairs`** | Duo partnerships (e.g. CD & BR) | `id`, `user_a_id`, `user_b_id`, `status` |
| **`user_streaks`** | Real-time streak statistics | `user_id`, `current_login_streak`, `current_clean_streak`, `current_workout_streak`, `streak_freeze_count` |
| **`login_activity_logs`** | Daily login audit logs | `user_id`, `activity_date`, `first_login_at`, `device_type` |
| **`attendance_logs`** | Daily discipline records | `user_id`, `date`, `relapsed`, `reason`, `trigger_category`, `emotion_state`, `urge_intensity` |
| **`exercises_catalog`** | 12 guided exercises library | `id`, `name`, `order_num`, `default_duration_sec`, `image_url`, `tips` |
| **`workout_sessions`** | Completed workout sessions | `id`, `user_id`, `total_duration_sec`, `exercises_completed_count`, `workout_date` |
| **`workout_exercise_logs`** | Per-exercise performance logs | `session_id`, `exercise_id`, `actual_duration_sec`, `completed` |
| **`challenges_catalog`** | Milestone challenges | `id`, `title`, `challenge_type`, `target_days`, `xp_reward` |
| **`user_challenges`** | Active user challenge progress | `user_id`, `challenge_id`, `current_progress_days`, `status` |
| **`badges_catalog`** | Gamified badge definitions | `id`, `name`, `tier` (`bronze`, `silver`, `gold`, `diamond`) |
| **`user_badges`** | Badges unlocked by users | `user_id`, `badge_id`, `unlocked_at` |
| **`daily_motivations`** | Cached AI daily insights | `date`, `focus_theme`, `headline`, `quote`, `neuroscience_insight` |
| **`user_reminder_settings`** | Push & SMS schedules | `user_id`, `phone_number`, `reminder_time`, `enabled`, `ntfy_topic` |

### Automated Functions & Triggers
1. **`handle_user_daily_login(clerk_id, timezone, device)`**: Stored procedure that calculates consecutive daily logins, updates `current_login_streak` and `longest_login_streak`, handles midnight resets, and tracks daily sessions.
2. **`handle_workout_completed()`**: PostgreSQL trigger on `workout_sessions` that automatically increments workout streaks and advances active challenges (e.g., 7-Day Workout Blitz) upon completion.

---

## 📁 Folder Structure

```plaintext
BeyondLimits/
├── .agents/                        # Installed Agent Skills (Clerk, Supabase, Postgres)
├── app/                            # Next.js 15 App Router
│   ├── api/                        # Serverless API Routes
│   │   ├── attendance/             # Attendance CRUD & Supabase sync
│   │   ├── chat/                   # Motivational AI coach chat
│   │   ├── motivation/             # Daily AI motivation generation
│   │   ├── news/                   # Daily tech news aggregator
│   │   ├── reminders/              # Scheduled 8:00 PM SMS / Push triggers
│   │   ├── workout/complete/       # Workout session persistence & streak advance
│   │   └── youtube/                # Curated discipline video recommendations
│   ├── sign-in/[[...sign-in]]/     # Clerk Sign-In Page (High-Contrast White Theme)
│   ├── sign-up/[[...sign-up]]/     # Clerk Sign-Up Page (High-Contrast White Theme)
│   ├── globals.css                 # Tailwind CSS 4 & Clerk overrides
│   ├── layout.tsx                  # Root layout, ClerkProvider, fonts & Puter.js
│   ├── loading.tsx                 # Suspense loading state with logo animation
│   ├── manifest.ts                 # PWA Web Manifest definition
│   └── page.tsx                    # Protected Dashboard Home (Server Component)
├── components/                     # React UI Components
│   ├── AuthGlassLayout.tsx         # Centered White Theme Authentication Layout
│   ├── DisciplineDashboardClient.tsx# Main Dashboard (Attendance, Charts, Motivations)
│   ├── VoiceFireCanvas.tsx         # Three.js 3D Particle Fire Stage
│   └── WorkoutModal.tsx            # 12-Exercise Guided Routine with Voice TTS & Timers
├── data/                           # Local Data Persistence
│   └── discipline-tracker-store.json# Local JSON database seed & fallback
├── lib/                            # Shared Utilities & Business Logic
│   ├── db.ts                       # Dual-mode SQLite/JSON database abstraction
│   ├── supabase.ts                 # Supabase Client SDK initialization
│   ├── supabase-service.ts         # Supabase database operations & streak sync
│   ├── types.ts                    # TypeScript interface & schema definitions
│   ├── workout-data.ts             # 12-exercise dataset, tips, and images
│   └── workout-sound.ts            # Web Audio API sound synthesizer & Speech TTS
├── public/                         # Static Assets & PWA Icons
│   ├── assets/                     # High-res exercise visual guides & reference logos
│   │   ├── BeyondLimits Neon Lightning Logo.png # Master logo asset
│   │   └── aistudio/exercises/     # 12 Exercise illustration PNGs
│   ├── favicon.ico                 # App favicon
│   ├── logo.png                    # Brand logo
│   ├── icon.png                    # 32x32 web icon
│   ├── pwa-192x192.png             # Android PWA icon
│   ├── pwa-512x512.png             # High-res PWA icon
│   ├── pwa-maskable-512x512.png    # Adaptive Android maskable icon
│   ├── apple-touch-icon.png        # iOS home screen icon
│   └── sw.js                       # Progressive Web App Service Worker
├── supabase/                       # Supabase Database Configuration
│   ├── migrations/                 # Migration scripts (20261108235122_initial_schema.sql)
│   ├── seed.sql                    # Initial seed data for Bharath CD & Bharath R
│   └── setup_complete.sql          # All-in-one SQL setup script for Supabase Dashboard
├── .env.example                    # Environment variables template
├── middleware.ts                   # Clerk Edge Middleware route protection
├── package.json                    # Dependencies & project scripts
└── README.md                       # Project documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js** (v18.17.0 or higher) or **Bun** (recommended)
* **Git** installed on your system
* A free [Clerk account](https://dashboard.clerk.com) for authentication keys
* A free [Supabase account](https://supabase.com/dashboard) for PostgreSQL database hosting

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/bharathpesu/beyondlimits.git
cd beyondlimits
```

### Step 2: Install Dependencies
Using **Bun** (recommended):
```bash
bun install
```
*Or using **npm**:*
```bash
npm install
```

---

### Step 3: Configure Environment Variables
Copy the example environment file:
```bash
cp .env.example .env.local
```

Open `.env.local` and populate the required keys:

```ini
# 1. Clerk Authentication Keys (From https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

# 2. Supabase Cloud Database (From Project Settings > API on https://supabase.com/dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 3. Optional AI & Search Enhancements
GEMINI_API_KEY=your_gemini_api_key
TAVILY_API_KEY=your_tavily_api_key
APP_URL=http://localhost:3000
```

---

### Step 4: Setup the Supabase Database
1. Open your project on the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor** (`https://supabase.com/dashboard/project/<your-ref>/sql/new`).
3. Copy the entire contents of [`supabase/setup_complete.sql`](supabase/setup_complete.sql) and paste it into the editor.
4. Click **Run** (or press <kbd>Ctrl</kbd>+<kbd>Enter</kbd>).
5. All 14 tables, triggers, indexes, 12 exercises, challenges, and seed data will be created automatically.

---

### Step 5: Start the Development Server
```bash
bun dev
```
*Or with npm:*
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

* To view the Sign-In page directly: [http://localhost:3000/sign-in](http://localhost:3000/sign-in)
* To access via mobile on the same local network: `http://<your-local-ip>:3000/sign-in`

---

## 🛠️ Verification & Build Commands

```bash
# Type check TypeScript code
bun run build --dry-run   # or: ./node_modules/.bin/tsc --noEmit

# Lint source files
npm run lint

# Production build
bun run build            # or: ./node_modules/.bin/next build

# Start production server
bun run start            # or: npm start
```

---

## 👨‍💻 Creator & Developer

**BeyondLimits** was architected and developed by:

* **Bharath CD** — *Lead Full-Stack Developer & Creator*
  * **Email**: [cdbharath234@gmail.com](mailto:cdbharath234@gmail.com)
  * **GitHub**: [@bharathpesu](https://github.com/bharathpesu)
  * **Motto**: *"Discipline over impulse. Zero excuses."*

* **Bharath R** — *Accountability Partner & Co-Practitioner*
  * **Motto**: *"Master the mind, master the day."*

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
Copyright (c) 2026 Bharath CD

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

<p align="center">
  <strong>BeyondLimits — Break Your Limits. Master Your Mind.</strong>
</p>

