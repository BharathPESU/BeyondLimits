# BeyondLimits Agent Instructions & Engineering Protocol

Every AI agent interacting with this repository MUST adhere to these mandatory operating principles and architecture guidelines.

---

## Part I: Mandatory 6-Step Engineering Workflow

### 1. Think Like a Senior Engineer (Reasoning First)
- **Do NOT blindly rush into code**: When given a prompt or bug report, reason through the problem first.
- **Investigate root causes**: Never patch symptoms or guess models, API endpoints, or schemas. List and query actual available APIs and libraries.
- **Analyze technical constraints**: Account for API quotas, mobile WebView limitations, audio gesture policies, WebAuthn hardware quirks, and data consistency.

### 2. Formulate a Concrete Plan
Before making any changes:
- Clarify **what needs to be built or fixed**.
- Explicitly list **all files that must be modified or created** across the frontend, API routes, Capacitor/Android layer, and SQLite/JSON databases.
- Outline the step-by-step implementation path to prevent regressions.

### 3. Rigorous Testing & Verification
Implementation is NOT complete until verified with working evidence:
- **Type Checking**: Run `npx tsc --noEmit` and confirm **0 errors**.
- **Production Build**: Run `npm run build` and ensure all static/dynamic routes build cleanly.
- **Runtime Testing**: Test modified API endpoints and verify expected responses and latency using real requests.

### 4. Build the Native Android APK
Whenever mobile features, Capacitor configurations, or core app updates are completed:
- Sync Capacitor configurations: `npx cap copy android`.
- Prevent recursive asset bloat (ensure `public/beyondlimits.apk` is not duplicated inside Android assets).
- Compile the APK using Gradle: `cd android && ./gradlew assembleDebug && cd ..`.
- Copy the fresh APK to `public/beyondlimits.apk` so the mobile download button serves the latest build.

### 5. Version Control & GitHub Sync
- Stage all changes: `git add .`.
- Craft a clear, descriptive commit message documenting the engineering changes.
- Push to GitHub: `git push origin main`.

### 6. Deploy to Vercel Production
- Deploy live to Vercel:
  ```bash
  export VERCEL_TOKEN=$(grep '^VERCEL_TOKEN=' .env.local | cut -d= -f2- | tr -d '"' | tr -d "'")
  NODE_OPTIONS="--require $(pwd)/scratch/dns-override.js" npx vercel deploy --prod --yes --token="$VERCEL_TOKEN"
  ```
- Verify the live production deployment on `https://project-vuxsx.vercel.app`.

---

## Part II: UI & Media Architecture Guidelines

### 1. Visual Design System & Theme Consistency
- **Primary Theme**: Clean, modern, athletic light theme.
  - Page Background: `bg-slate-50 text-slate-900`
  - Surface Cards: `bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-sm`
  - Primary Brand Accent: Teal (`bg-teal-700 hover:bg-teal-800 text-white font-bold`, badges: `bg-teal-50 text-teal-700 border border-teal-200/60`)
  - Secondary Neutral: Slate (`bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200`)
- **Modals & Dialogs**:
  - Modal Backdrop: `fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto`
  - Modal Box: `w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 text-slate-900`
  - Form Inputs: `bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none transition-all`
  - Primary Buttons: `bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-sm transition-all`
- **Theme Boundary Rules**:
  - Dark/cyberpunk styling is **STRICTLY RESERVED** for the Three.js Iron Man JARVIS Arc Reactor visualizer stage.
  - Never apply dark neon or glowing cyan to Profile, Settings, News, Quotes, Attendance, or Workout modals. All modals must remain consistent with the athletic light theme.

---

### 2. Voice Assistant & JARVIS Briefing Rules
- **Initial Welcome Only**: The daily discipline briefing voice plays only once on initial app open (`hasAutoPlayedRef.current`).
- **No Global Click Hijacking**: Never attach global `window.addEventListener('pointerdown', ...)` or click listeners that trigger voice briefings on unrelated user clicks.
- **Explicit Trigger Only**: Replaying voice occurs only when clicking the 3D Arc Reactor canvas (`onReplayVoice`), tapping "Read Aloud", or saying the wake word ("Jarvis").
- **Auto-Stop on Modal Open**: When any music or workout modal opens, background assistant speech must stop immediately.
- **Native Gemini TTS with Emotions**: Use `gemini-3.8-flash-tts` (`/api/tts`) with prebuilt neural voices (`Puck`, `Charon`, `Kore`, `Fenrir`, `Aoede`) and inline emotion directives (`energetic_confident`, `fierce_discipline`, `calm_focus`).

---

### 3. Workout Music & YouTube Player Architecture
- **Persistent Media Elements**:
  - In `WorkoutModal.tsx`, the YouTube player iframe (`<iframe ref={workoutIframeRef} ... />`) must be mounted as a **single persistent off-screen element** throughout the workout session.
  - **NEVER** render separate iframes inside conditional phase blocks (`phase === 'active'` vs `phase === 'rest'`). Unmounting an iframe resets playback to `0:00`.
- **Audio-Only Mode**:
  - The YouTube iframe is mounted off-screen (`fixed -top-[9999px] -left-[9999px] opacity-0 pointer-events-none`) so audio streams smoothly without showing video frames.
  - Floating top-center expandable controller manages playback, track skipping, and volume.
- **Custom Timestamp Voice Motivation Cues**:
  - The 12 exercises use ordered custom voice files (`public/voice/exercise_complete_{1-12}.mp3`).
  - Upon exercise completion, background music pauses and the voice cue plays.
  - When the voice finishes, music resumes automatically for the rest interval.

---

### 4. Header & Top-Right Navigation
- When signed in, the top-right header must display **ONLY the user's avatar image** via Clerk's `<UserButton>`.
- Do not add separate standalone profile or settings buttons in the header bar.
- Use `<UserButton.MenuItems>` with `<UserButton.Action>` for **"My Profile"** and **"AI & Gemini Settings"** so all user actions are centralized in the avatar menu.
