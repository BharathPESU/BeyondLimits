# 004 — Wire `tw-animate-css` and Define Core Animation Keyframes

- **Status**: DONE
- **Commit**: e1992bb
- **Severity**: HIGH
- **Category**: Cohesion & Tokens
- **Estimated scope**: 1 file (`app/globals.css`)

## Problem

1. `tw-animate-css` is installed as a dependency in `package.json:48`, but is **never imported** in `app/globals.css`. As a result, standard Tailwind v4 animation utilities used across the application:
   - `animate-in fade-in zoom-in-95 duration-200` in `components/WorkoutModal.tsx:1203`
   - `animate-in fade-in zoom-in-95 duration-150` in `components/PWAInstallButton.tsx:40`
   - `animate-in fade-in` in `components/admin/AdminDashboardClient.tsx:385, 391, 1059, 1189`
   are dead CSS classes that produce zero motion.
2. In `components/BiometricAppLock.tsx` (lines 480, 513, 557, 590, 667, 724), custom classes `animate-fadeIn` and `animate-shake` are used for error feedback and view switching, but no keyframes are defined anywhere in the codebase.

## Target

1. Import `tw-animate-css` directly into `app/globals.css`:
```css
@import "tailwindcss";
@import "tw-animate-css";
```
2. Define explicit keyframes and utilities for `fadeIn` and `shake` in `app/globals.css`:
```css
/* Custom Micro-Animation Keyframes */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  20%, 60% {
    transform: translateX(-4px);
  }
  40%, 80% {
    transform: translateX(4px);
  }
}

.animate-fadeIn {
  animation: fadeIn 220ms var(--ease-out) forwards;
}

.animate-shake {
  animation: shake 300ms ease-in-out;
}
```

## Repo conventions to follow

- Tailwind v4 imports reside at the very top of `app/globals.css`.
- Keyframes and custom animation utilities are placed under the UI/UX Guidelines section of `app/globals.css`.

## Steps

1. In `app/globals.css:1`, add `@import "tw-animate-css";` immediately after `@import "tailwindcss";`.
2. In `app/globals.css`, add the `@keyframes fadeIn`, `@keyframes shake`, `.animate-fadeIn`, and `.animate-shake` definitions.
3. Verify that `zoom-in-95` does not conflict with Kowalski's rule ("Never scale(0)"): `zoom-in-95` scales from 0.95, which is within the compliant range (0.90–0.97).

## Boundaries

- Do NOT edit `package.json` (the package `tw-animate-css` is already installed).
- Do NOT change component prop names.

## Verification

- **Mechanical**:
  - `npm run build` succeeds and confirms `@import "tw-animate-css";` is compiled into the stylesheet.
- **Feel check**:
  - Open the floating music pill in Workout mode: the mini controller scales smoothly from 95% to 100% with a clean fade.
  - In `BiometricAppLock`, enter an invalid PIN: the error message performs a crisp horizontal shake without layout displacement.
- **Done when**: All `animate-in`, `fade-in`, `zoom-in-95`, `animate-fadeIn`, and `animate-shake` elements execute their motion cleanly on screen.
