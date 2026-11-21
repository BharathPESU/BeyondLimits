# 001 — Scope Blanket Transitions and Adopt Shared Motion Tokens

- **Status**: DONE
- **Commit**: e1992bb
- **Severity**: HIGH
- **Category**: Performance / Easing & duration
- **Estimated scope**: 1 file (`app/globals.css`)

## Problem

In `app/globals.css` (lines 379–385), a blanket transition rule is applied indiscriminately across all rounded containers and interactive elements:

```css
/* app/globals.css:379-385 — current */
/* Micro-interactions & Smooth Transitions across interactive controls */
button, a, input, select, textarea, div[role="dialog"], .rounded-2xl, .rounded-xl {
  transition: background-color 250ms cubic-bezier(0.4, 0, 0.2, 1),
              border-color 250ms cubic-bezier(0.4, 0, 0.2, 1),
              color 250ms cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1),
              transform 200ms ease;
}
```

This causes two severe motion and rendering defects:
1. **Pervasive Style Recalculations**: Binding `transform 200ms ease` and multi-property transitions to every `.rounded-2xl`, `.rounded-xl`, and `div[role="dialog"]` container triggers expensive layout and composite recalculations across dozens of static cards and grids on the dashboard whenever any child state updates.
2. **Symmetric, Weak Easing**: Built-in `ease` is symmetric and slow to initiate. Kowalski's guidelines state that interactive UI presses and feedback must use an asymmetric curve with snappy release (`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`) and a tight duration (100–160ms for button press feedback).

## Target

Introduce standardized motion tokens to `:root` in `app/globals.css`:
```css
/* Motion Tokens (Emil Kowalski Animation Philosophy) */
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  --duration-fast: 160ms;
  --duration-normal: 250ms;
  --duration-modal: 300ms;
}
```

Refactor the transition rule so it strictly targets interactive controls (`button, a, input, select, textarea`), completely removing container classes (`div[role="dialog"], .rounded-2xl, .rounded-xl`):
```css
/* Target */
button, a, input, select, textarea {
  transition: background-color var(--duration-normal) var(--ease-out),
              border-color var(--duration-normal) var(--ease-out),
              color var(--duration-normal) var(--ease-out),
              box-shadow var(--duration-normal) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

button:active {
  transform: scale(0.97);
  transition: transform var(--duration-fast) var(--ease-out);
}
```

## Repo conventions to follow

- Theme variables and global styles live in `app/globals.css`.
- New easing tokens are declared in the `:root` block alongside `--theme-primary`.
- Existing exemplar of CSS variable usage: `transition: background-color 250ms cubic-bezier(0.4, 0, 0.2, 1)` at `app/globals.css:198`.

## Steps

1. In `app/globals.css`, add the motion token block inside `:root` (around line 128):
   ```css
   --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
   --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
   --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
   --duration-fast: 160ms;
   --duration-normal: 250ms;
   --duration-modal: 300ms;
   ```
2. In `app/globals.css`, replace lines 379–385 with the refined interactive selector:
   ```css
   button, a, input, select, textarea {
     transition: background-color var(--duration-normal) var(--ease-out),
                 border-color var(--duration-normal) var(--ease-out),
                 color var(--duration-normal) var(--ease-out),
                 box-shadow var(--duration-normal) var(--ease-out),
                 transform var(--duration-fast) var(--ease-out);
   }
   ```
3. Update `button:active` at lines 398–400 to use explicit duration and easing:
   ```css
   button:active {
     transform: scale(0.97);
     transition: transform var(--duration-fast) var(--ease-out);
   }
   ```

## Boundaries

- Do NOT remove color/background transition tokens required by dynamic theme switching.
- Do NOT touch modal layouts or component TypeScript files in this plan.
- Do NOT add new npm dependencies.

## Verification

- **Mechanical**:
  - `npx tsc --noEmit` returns 0 errors.
  - `npm run build` succeeds without CSS syntax errors.
- **Feel check**:
  - Click any dashboard action button or tab: press feedback `scale(0.97)` feels instantaneous and snaps back immediately upon release.
  - In DevTools Animations panel (set to 10% speed), inspect card containers (`.rounded-2xl`): confirm they no longer have transition styles recalculating when hovered or re-rendered.
- **Done when**: Container elements are decoupled from interactive button transitions and button clicks feel crisp and responsive.
