# BeyondLimits UI & Media Architecture Guidelines

## 1. Visual Design System & Theme Consistency
- **Primary Theme**: Clean, modern, athletic light theme.
  - Page Background: `bg-slate-50 text-slate-900`
  - Surface Cards: `bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-sm`
  - Primary Brand Accent: Teal (`bg-teal-700 hover:bg-teal-800 text-white font-bold`, badges: `bg-teal-50 text-teal-700 border border-teal-200/60`)
  - Secondary Neutral: Slate (`bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200`)
- **Modals & Dialogs**:
  - Modal Backdrop: `fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto` (or full-screen `fixed inset-0 z-50 bg-slate-50 flex flex-col`)
  - Modal Box: `w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 text-slate-900`
  - Form Inputs: `bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none transition-all`
  - Primary Buttons: `bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-sm transition-all`
- **Theme Boundary Rules**:
  - Dark/cyberpunk styling is **STRICTLY RESERVED** for the Three.js Iron Man JARVIS Arc Reactor visualizer stage.
  - Never apply dark neon, glowing cyan, or cyberpunk palettes to Profile, Settings, News, Quotes, Attendance, or Workout modals. All modals must remain consistent with the BeyondLimits athletic light theme.

---

## 2. Voice Assistant & JARVIS Briefing Rules
- **Initial Welcome Only**: The daily discipline briefing voice plays only once on initial app open (`hasAutoPlayedRef.current`).
- **No Global Click Hijacking**: Never attach global `window.addEventListener('pointerdown', ...)` or click listeners that trigger voice briefings on unrelated user clicks (such as playing music or clicking modals).
- **Explicit Trigger Only**: Replaying the voice must only occur when the user explicitly clicks the 3D Arc Reactor canvas (`onReplayVoice`) or taps the "Read Voice" button.
- **Auto-Stop on Modal Open**: When any music or workout modal opens, background assistant speech must stop immediately.

---

## 3. Workout Music & YouTube Player Architecture
- **Persistent Media Elements**:
  - In `WorkoutModal.tsx`, the YouTube player iframe (`<iframe ref={workoutIframeRef} ... />`) must be mounted as a **single persistent element** in the DOM throughout the active workout session.
  - **NEVER** render separate iframes inside conditional phase blocks (`phase === 'active'` vs `phase === 'rest'`). Unmounting an iframe resets playback to `0:00`.
- **Pause & Resume Continuation**:
  - When the 60-second exercise completes, send `pauseVideo` via `postMessage`.
  - Coach voice announces: `"You have completed [Exercise]. Rest time. Next up is [Upcoming Exercise]."`.
  - When voice announcement finishes, send `playVideo` via `postMessage`. Because the iframe remained mounted, playback resumes from the exact paused timestamp without restarting.
- **Autoplay In Order**:
  - Listen for YouTube `onStateChange` ended event (`info === 0`).
  - When a song ends, automatically advance to `(workoutSongIndex + 1) % MOTIVATIONAL_SONGS.length`.

---

## 4. Header & Top-Right Navigation
- When signed in, the top-right header must display **ONLY the user's avatar image** via Clerk's `<UserButton>`.
- Do not add separate standalone profile or settings buttons in the header bar.
- Use `<UserButton.MenuItems>` with `<UserButton.Action>` for **"My Profile"** and **"AI & Gemini Settings"** so all user actions are centralized in the avatar menu.
