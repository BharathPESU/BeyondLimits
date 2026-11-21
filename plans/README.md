# Animation Implementation Plans — BeyondLimits

Self-contained motion improvement plans based on Emil Kowalski's animation philosophy. Written for autonomous or delegated execution.

## Plans Index

| # | Plan | Severity | Category | Status |
|---|---|---|---|---|
| **001** | [001-scope-blanket-transitions.md](001-scope-blanket-transitions.md) | HIGH | Performance & Easing | DONE |
| **002** | [002-eliminate-transition-all.md](002-eliminate-transition-all.md) | HIGH | Performance | DONE |
| **003** | [003-prefers-reduced-motion.md](003-prefers-reduced-motion.md) | HIGH | Accessibility | DONE |
| **004** | [004-wire-tw-animate-css-and-keyframes.md](004-wire-tw-animate-css-and-keyframes.md) | HIGH | Cohesion & Tokens | DONE |
| **005** | [005-modal-entrance-transitions.md](005-modal-entrance-transitions.md) | HIGH | Missed Opportunities | DONE |

---

## Recommended Execution Order

1. **`001-scope-blanket-transitions.md`**: Foundational token setup (`--ease-out`, `--ease-in-out`, standard durations) and unbinding of blanket transitions from non-interactive containers.
2. **`002-eliminate-transition-all.md`**: Eliminates `transition: all` across global utility classes using tokens from Plan 001.
3. **`003-prefers-reduced-motion.md`**: Establishes global reduced-motion and touch-screen hover guardrails.
4. **`004-wire-tw-animate-css-and-keyframes.md`**: Connects Tailwind v4 animate utilities and core micro-keyframes (`fadeIn`, `shake`).
5. **`005-modal-entrance-transitions.md`**: Applies smooth backdrop fades and card scale-ins across primary modals.

## Dependencies

- Plan 002, Plan 004, and Plan 005 depend on the motion tokens defined in Plan 001.
- Plan 003 can execute independently at any stage.
