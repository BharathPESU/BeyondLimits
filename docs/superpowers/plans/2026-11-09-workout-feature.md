# Workout & Exercise Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a guided, interactive 12-exercise home workout feature with audio text-to-speech coaching, custom timers (60s exercise, 30s rest with +10s extension and skip), and integrate an "Exercise" button into the bottom navigation bar.

**Architecture:** Create a self-contained workout module consisting of exercise definitions (`lib/workout-data.ts`), audio/speech helper utilities (`lib/workout-sound.ts`), and a full-featured workout modal (`components/WorkoutModal.tsx`) with a 5-step workflow (Overview -> Ready to Go -> Active Exercise -> Rest -> Completed). Connect the modal to the app's primary navigation in `components/DisciplineDashboardClient.tsx`.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS 4, Lucide React icons, Web Speech API (`SpeechSynthesis`), Web Audio API (`AudioContext`).

---

### Task 1: Create Workout Data Definitions & Sound Utilities

**Files:**
- Create: `lib/workout-data.ts`
- Create: `lib/workout-sound.ts`

- [ ] **Step 1: Create `lib/workout-data.ts`**
Define the 12 workout exercises in ordered sequence with titles, durations (60 seconds), image assets located at `/assets/aistudio/exercises/`, focus muscles, and form tips.

- [ ] **Step 2: Create `lib/workout-sound.ts`**
Implement text-to-speech wrapper with safe SSR checks (`typeof window !== 'undefined'`) and Web Audio API beeper for countdown sounds (3, 2, 1, and chime).

- [ ] **Step 3: Verify TypeScript builds for lib modules**
Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

---

### Task 2: Build the WorkoutModal Component

**Files:**
- Create: `components/WorkoutModal.tsx`

- [ ] **Step 1: Implement the 5 Workout Workflow Views**
  1. **Overview View**: Header banner, "Full Body Home Workout", 12 exercises, ~18 mins total, large "Start Workout" button, list of exercises with thumbnails.
  2. **Ready to Go View**: Exercise visual card at top, "READY TO GO!", exercise title, 10s circular countdown timer, skip button, and voice announcement: *"Ready to go, this is the next exercise: [Exercise Name]"*.
  3. **Active Exercise View**: Top section displaying the 1254x1254 exercise infographic illustration with instructions, exercise title, 60s countdown timer (`01:00`), Play/Pause toggle, Previous and Skip buttons, audio 3-2-1 beeps.
  4. **Rest View**: 30-second rest countdown timer, preview of next exercise image at the top, "+10s" extend button, "Skip" button, and voice announcement.
  5. **Completed View**: Celebration screen with workout completion stats and options to repeat or close.

- [ ] **Step 2: Verify component compiles cleanly**
Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

---

### Task 3: Integrate "Exercise" into Navigation Bar & DisciplineDashboardClient

**Files:**
- Modify: `components/DisciplineDashboardClient.tsx`

- [ ] **Step 1: Add Exercise state and WorkoutModal import**
Import `WorkoutModal` and `Dumbbell` icon in `components/DisciplineDashboardClient.tsx`. Add `const [isWorkoutOpen, setIsWorkoutOpen] = useState(false);`.

- [ ] **Step 2: Update Fixed Bottom Navigation Bar**
Adjust grid columns from `grid-cols-5` to `grid-cols-6` and add the "Exercise" button with `Dumbbell` icon styled consistently with existing navigation buttons.

- [ ] **Step 3: Mount `<WorkoutModal />`**
Render `<WorkoutModal isOpen={isWorkoutOpen} onClose={() => setIsWorkoutOpen(false)} />` alongside existing modals.

---

### Task 4: Verification and End-to-End Build Test

**Files:**
- Test full project build and verify no regressions.

- [ ] **Step 1: Run production build check**
Run: `npm run build`
Expected: Build succeeds with 0 errors.

- [ ] **Step 2: Verify asset accessibility**
Verify all 12 exercise images in `public/assets/aistudio/exercises/` are reachable and load correctly.

