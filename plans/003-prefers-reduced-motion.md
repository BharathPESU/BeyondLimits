# 003 — Implement Comprehensive `prefers-reduced-motion` Accessibility

- **Status**: DONE
- **Commit**: e1992bb
- **Severity**: HIGH
- **Category**: Accessibility
- **Estimated scope**: 1 file (`app/globals.css`)

## Problem

A grep across the entire codebase (`app/` and `components/`) reveals **zero** `@media (prefers-reduced-motion: reduce)` rules.
- Users who have enabled "Reduce Motion" in their operating system (due to motion sickness, vestibular disorders, or sensory sensitivity) are subjected to continuous animations: `animate-pulse` on active agent badges, `animate-spin` on loading spinners, pulsing cards, and scaling transformations.
- Per Emil Kowalski's animation guidelines, reduced motion means fewer and gentler animations, **not zero** — essential comprehension feedback (opacity, color changes) must remain, while spatial displacement, bouncing, and scale animations must be collapsed.

## Target

Add a comprehensive accessibility media query in `app/globals.css`:

```css
/* Accessibility: prefers-reduced-motion & touch-gated hover */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Preserve essential opacity transitions for comprehension */
  .fade-in,
  [data-state="open"],
  [data-state="closed"] {
    transition-property: opacity !important;
    transition-duration: 150ms !important;
  }

  /* Disable persistent pulsing and pinging animations */
  .animate-pulse,
  .animate-ping,
  .animate-spin,
  .animate-bounce {
    animation: none !important;
  }
}

/* Touch screen hover protection: avoid sticky hovers on mobile */
@media (hover: none) and (pointer: coarse) {
  .theme-interactive:hover,
  .theme-btn-primary:hover {
    transform: none !important;
  }
}
```

## Repo conventions to follow

- Append global accessibility overrides to the bottom of `app/globals.css`.
- Ensure utility classes from Tailwind and custom theme classes are safely respected.

## Steps

1. Open `app/globals.css`.
2. Append the `@media (prefers-reduced-motion: reduce)` block and the `@media (hover: none)` touch protection block to the end of the file.
3. Ensure no existing transitions bypass `!important` flags inside the reduced motion block.

## Boundaries

- Do NOT remove visual state indicators (e.g. active color indicators, borders, or checkmark icons).
- Do NOT touch JavaScript logic or component markup.

## Verification

- **Mechanical**:
  - `npm run build` succeeds.
- **Feel check**:
  - Open Chrome DevTools -> Press `Ctrl+Shift+P` -> Type `Show Rendering` -> Select `Emulate CSS media feature prefers-reduced-motion: reduce`.
  - Interact with buttons, open modals, trigger Jarvis mic pulse:
    - Button clicks change color/opacity instantly without scaling.
    - Continuous pulsing dots (`animate-pulse`) remain static without flickering.
    - Modals appear instantly via opacity fade without translation jumps.
  - Turn off `prefers-reduced-motion`: normal smooth transitions immediately resume.
- **Done when**: The app completely respects the user's OS reduced-motion preference without degrading core functionality.
