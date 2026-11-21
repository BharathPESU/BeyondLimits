# Cyber-Athletic UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the BeyondLimits UI into the high-octane, glassmorphic cyber-athletic design shown in the user's reference screenshots (WhatsApp Unknown 2026-11-21 at 5.21.13 PM), featuring the floating capsule bottom navigation dock, glowing multi-theme card architectures, and polished modals across all 3 color themes.

**Architecture:** Extend `app/globals.css` with dynamic cyber utility classes (`.cyber-card`, `.cyber-nav-dock`, `.cyber-pill-active`, `.cyber-btn-primary`, `.cyber-badge`) bound to CSS variables (`--theme-primary`, `--theme-glow`, `--theme-surface`, `--theme-border`). Refactor the dashboard client, navigation bar, and each feature modal (`AttendanceCalendarModal`, `MotivationHubModal`, `MotivationalChatModal`, `UserSettingsModal`, `WorkoutModal`) into the exact layout and hierarchy seen in reference images 1–6.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS v4, Lucide React icons, Three.js (Arc Reactor), Capacitor Android.

---

### Task 1: Foundation & CSS Cyber-Athletic Design System

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Define cyber glassmorphism, glowing capsule, and dock navigation tokens in globals.css**
  - Add `.cyber-card`: glassmorphic background with theme border, subtle inner highlight, and dynamic theme glow shadow.
  - Add `.cyber-nav-dock`: fixed floating pill dock with backdrop blur, rounded-full border, and subtle top elevation.
  - Add `.cyber-pill-active`: glowing pill border (`border border-[var(--theme-primary)]`), subtle theme tint background, and neon glow.
  - Add `.cyber-btn-primary`: solid pill button with high-contrast font, bold rounded-full or rounded-2xl geometry.
  - Add `.cyber-slider`: themed range slider styling for settings.

- [ ] **Step 2: Verify CSS compilation**
  Run: `npm run build`
  Expected: Clean build without PostCSS/Tailwind errors.

---

### Task 2: Dashboard Header, Arc Reactor, & Floating Capsule Navigation Dock

**Files:**
- Modify: `components/DisciplineDashboardClient.tsx`

- [ ] **Step 1: Re-architect Dashboard Header (Ref Image 2)**
  - Left: Logo in dark rounded square with neon border (`border border-[var(--theme-primary)]/40 p-1.5 rounded-xl bg-slate-900/90`).
  - Brand Title: "BeyondLimits" with adjacent "Discipline & Fitness" dumbbell pill badge.
  - Profile Avatar: Circular avatar with glowing theme ring.
  - Download Button: Compact dark rounded square button with download icon.

- [ ] **Step 2: Re-architect Arc Reactor & Voice Action Card (Ref Image 2)**
  - Top card badge: "● JARVIS NK-VI // ONLINE" pill.
  - Subtitle: "CLICK REACTOR TO DISCHARGE ENERGY ▶ DRAG TO TILT 3D".
  - Audio bar: "||| JARVIS DISCIPLINE VOICE" wave icon.
  - Controls row:
    - Primary "🔊 Play Voice" solid theme pill button.
    - Refresh/sync dark circular icon button.
    - "🤖 Agent: OFF/ON" toggle switch in dark pill container.

- [ ] **Step 3: Re-architect Monthly Habit Analytics Card with Waveform Graphic (Ref Image 2)**
  - Trophy icon badge, header "Monthly Self-Control & Habit Analytics", subtitle "Impulse control and masturbation frequency".
  - Bottom glowing SVG waveform accent curve.

- [ ] **Step 4: Implement Floating Capsule Bottom Navigation Bar (Ref Image 2)**
  - Replace current rectangular 6-column grid with floating cyber dock:
    - Outer container: `fixed bottom-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:max-w-xl z-40 bg-slate-950/95 backdrop-blur-xl border border-slate-800/90 rounded-full px-2 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center justify-between gap-1`
    - Active Tab (e.g. "Attendance"): Glowing capsule container (`rounded-full border border-[var(--theme-primary)] bg-[var(--theme-primary)]/15 shadow-[0_0_15px_var(--theme-glow)] text-[var(--theme-primary)] px-3.5 py-1 flex flex-col items-center gap-0.5`).
    - Inactive Tabs ("Calendar", "Exercise", "Motivation", "News", "Agent"): Clean muted icon + label (`text-slate-400 hover:text-slate-200 flex flex-col items-center gap-0.5 px-2.5 py-1 text-[10px] font-medium`).

---

### Task 3: Motivation Hub Modal Redesign (Ref Image 1)

**Files:**
- Modify: `components/MotivationHubModal.tsx`

- [ ] **Step 1: Re-architect Header & Feature Cards**
  - Header: Back arrow in dark rounded square with theme border, red runner icon in dark glow badge, title "Motivation Hub".
  - Card 1 (Shorts): Deep cyber card with lime/amber glow, numbered list (#1 Nobody Is Coming to Save You, #2 Believe in Yourself, #3 Discipline Beats Motivation), and large pill button "🔥 Open Shorts (20) >".
  - Card 2 (Voice Quotes): Red quote icon badge, "20 Quotes" pill tag, preview quote italics, and pill button "🔊 Open Quotes (20) >".
  - Card 3 (Daily Briefing): Date badge, headline "Every Urge Conquered Transfers Raw Energy Into Your Real Ambitions", and solid theme pill button "🔊 Read Briefing Aloud".

---

### Task 4: Attendance Calendar Modal Redesign (Ref Image 3)

**Files:**
- Modify: `components/AttendanceCalendarModal.tsx`

- [ ] **Step 1: Re-architect Month Switcher, Legend, & 2x2 Stat Grid**
  - Month Switcher: `< Month Year >` dark controls + solid theme pill button "Today".
  - Legend Pills: "🔴 Clean (Controlled)" and "🟢 Relapsed".
  - 2x2 Stat Grid:
    - Card 1: MONTHLY CONTROL RATE (91%, "10 clean of 11 logged", green wave graphic).
    - Card 2: CLEAN DAYS (10 Days ✓, "Urges overridden", amber wave graphic).
    - Card 3: MONTHLY RELAPSES (1 Times ↗, "Relapse rate: 9%", red wave graphic).
    - Card 4: ACTIVE STREAK (8 Days, "Consecutive clean", lime wave graphic).
  - Summary Card: Lightbulb icon + "Strong Habit Control: You maintained self-discipline...".
  - Calendar Grid Card: Dark cyber container with glowing border, Mon–Sun headers, and clean pill indicators for Clean / Relapse.

---

### Task 5: Motivational Coach Agent Chat Modal Redesign (Ref Image 4)

**Files:**
- Modify: `components/MotivationalChatModal.tsx`

- [ ] **Step 1: Re-architect Header, Controls, Prompt Pills & Chat Bubbles**
  - Header: Left back arrow button, dark red chat icon badge, title "Discipline & Motivation Coach".
  - Controls bar: "Agent: OFF/ON" toggle switch, heart check-in button with pulse icon, clear history trash button.
  - Quick prompt pills: Rounded dark pills with subtle glowing borders for immediate tap queries.
  - Message bubbles:
    - Bot bubble: Glowing theme border, "● Autonomous Agent" footer with "🔊 Read Aloud" action.
    - User bubble: Dark container with warm accent border.
  - Bottom interaction bar:
    - Large full-width solid theme pill button: "🎙 Speak to AI Coach (Auto-Send)".
    - Input row: Dark pill input + solid theme "Send" pill button with paper plane icon.

---

### Task 6: AI & Jarvis Settings Modal Redesign (Ref Image 5)

**Files:**
- Modify: `components/UserSettingsModal.tsx`

- [ ] **Step 1: Re-architect Settings Form Elements**
  - Header intelligence badge: "✦ Sharp, relentless, focused terminal intelligence".
  - Voice model selection card with "FEMALE" / "MALE" pill badge.
  - Emotion & Motivation Style: 3-column grid ("⚡ Energetic" highlighted with active theme border and background, "🍃 Fierce", "🎯 Calm Focus").
  - Speech rate custom slider with theme accent track and thumb, showing rate badge (e.g. "1.20x").
  - Audio preview card with "▶ Play Demo" theme pill button.
  - Agent wake-up word card with input and "Save Word" pill button.
  - App Lock card with fingerprint icon, toggle, "Hardware Authentication Active" badge, "Test Sensor" button, and PIN row.
  - Full-width bottom pill button: "Done / Close Settings".

---

### Task 7: Workout Modal Redesign (Ref Image 6)

**Files:**
- Modify: `components/WorkoutModal.tsx`

- [ ] **Step 1: Re-architect Routine Tabs, Hero Card, & 12-Step List**
  - Header: Back arrow, "BeyondLimits Workout", music and speaker buttons.
  - Routine Tabs: "Full Body 12" (active solid theme pill), "Leg Day 6", "Chest & Arms".
  - Hero Card: "🔥 Full Body" badge, title "Full Body Discipline Routine", metadata badges (Time, Exercises, Audio Voice Coaching), and large solid theme pill button "▶ Start Workout".
  - Exercise Routine List: Section title "EXERCISE ROUTINE (12 STEPS)", right hint "Tap any exercise to preview", dark cards with thumbnail image, exercise number, and "01:00" badge.

---

### Task 8: Verification, Native Build, & Production Deployment

- [ ] **Step 1: Type Checking**
  Run: `npx tsc --noEmit`
  Expected: 0 errors.

- [ ] **Step 2: Production Build**
  Run: `npm run build`
  Expected: All 13 routes build successfully.

- [ ] **Step 3: Native Android APK**
  Run: `npx cap copy android && cd android && ./gradlew assembleDebug && cd .. && cp -f android/app/build/outputs/apk/debug/app-debug.apk public/beyondlimits.apk`
  Expected: Debug APK compiled and copied to `public/beyondlimits.apk`.

- [ ] **Step 4: Git Sync & Live Production Verification**
  Run: `git commit`, `git push origin main`, and verify `https://project-vuxsx.vercel.app` returns HTTP 200.
