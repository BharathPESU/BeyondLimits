# 005 — Smooth Backdrop Fade and Dialog Scale-In for Modal Windows

- **Status**: DONE
- **Commit**: e1992bb
- **Severity**: HIGH
- **Category**: Missed Opportunities / Purpose & frequency
- **Estimated scope**: 4 files (`app/globals.css`, `components/AttendanceModal.tsx`, `components/WorkoutModal.tsx`, `components/UserSettingsModal.tsx`)

## Problem

Full-screen modals and centered dialogs teleport into the DOM with zero spatial origin or transition feedback:
- `components/AttendanceModal.tsx:112-116`:
  ```tsx
  <div
    className="fixed inset-0 z-50 w-full h-full bg-slate-50 text-slate-900 flex flex-col overflow-hidden"
    role="dialog"
    aria-modal="true"
  >
  ```
- `components/UserSettingsModal.tsx:416-424`:
  ```tsx
  <div
    className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto pt-[max(env(safe-area-inset-top),20px)] pb-12"
    role="dialog"
    aria-modal="true"
  >
    <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 my-auto sm:my-8 text-slate-900">
  ```
- `components/WorkoutModal.tsx:391-395`:
  ```tsx
  <div
    className="fixed inset-0 z-50 w-full h-full bg-slate-50 text-slate-900 flex flex-col overflow-hidden"
    role="dialog"
    aria-modal="true"
  >
  ```

This causes abrupt visual snapping when switching between the dashboard and key features.
Per Emil Kowalski's guidelines:
- Modals are the documented exception where durations up to 300–400ms are encouraged.
- Modals must never scale from 0 (`scale(0)` is forbidden); they should enter smoothly from `scale(0.97)` with `opacity: 0` using `cubic-bezier(0.23, 1, 0.32, 1)`.
- Center origin (`transform-origin: center`) is correct for centered modals.

## Target

1. Define reusable modal entrance utilities in `app/globals.css`:
```css
/* Modal & Overlay Entrance Animations */
@keyframes modalBackdropFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modalContentScaleIn {
  from {
    opacity: 0;
    transform: scale(0.97);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes modalSheetSlideIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-backdrop-in {
  animation: modalBackdropFadeIn 250ms var(--ease-out) forwards;
}

.modal-dialog-in {
  animation: modalContentScaleIn 250ms var(--ease-out) forwards;
  transform-origin: center;
}

.modal-sheet-in {
  animation: modalSheetSlideIn 250ms var(--ease-out) forwards;
}
```

2. Add `.modal-sheet-in` to full-screen modals (`AttendanceModal.tsx:113`, `WorkoutModal.tsx:392`).
3. Add `.modal-backdrop-in` and `.modal-dialog-in` to centered dialog modals (`UserSettingsModal.tsx:417, 422`, `UserProfileModal.tsx:166, 171`).

## Repo conventions to follow

- All modal dialogs share the `role="dialog"` and `aria-modal="true"` attributes.
- Easing token `var(--ease-out)` from Plan 001 is used.

## Steps

1. In `app/globals.css`, append the modal entrance keyframes and utility classes (`.modal-backdrop-in`, `.modal-dialog-in`, `.modal-sheet-in`).
2. In `components/AttendanceModal.tsx:113`, add `modal-sheet-in` to the root container className.
3. In `components/WorkoutModal.tsx:392`, add `modal-sheet-in` to the root container className.
4. In `components/UserSettingsModal.tsx`:
   - Add `modal-backdrop-in` to line 417 (`className="fixed inset-0 ... modal-backdrop-in"`).
   - Add `modal-dialog-in` to line 422 (`className="w-full max-w-lg ... modal-dialog-in"`).

## Boundaries

- Do NOT alter any modal state logic, form handlers, or database saving triggers.
- Do NOT change modal z-indexes or fixed positioning classes.

## Verification

- **Mechanical**:
  - `npm run build` passes cleanly.
- **Feel check**:
  - Click "Settings" (gear icon): the dark backdrop smoothly fades in over 250ms while the white card gracefully scales up from 97% to 100% without jarring jumps.
  - Click "Calendar" or "Exercise" or "Attendance": full-screen view glides up smoothly with subtle 12px translation and opacity fade.
- **Done when**: All modals appear with smooth, natural physicality instead of abrupt instant pops.
