# 002 — Eliminate `transition: all` Across Global Utility Classes

- **Status**: DONE
- **Commit**: e1992bb
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 1 file (`app/globals.css`)

## Problem

In `app/globals.css`, multiple core classes use `transition: all`:

```css
/* app/globals.css:80 */
.cl-socialButtonsBlockButton {
  ...
  transition: all 0.2s ease !important;
}

/* app/globals.css:374-376 */
.theme-transition {
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* app/globals.css:403-409 */
.theme-surface-card {
  ...
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* app/globals.css:412-418 */
.theme-btn-primary {
  ...
  transition: all 200ms ease;
}
```

Using `transition: all` is an anti-pattern:
1. It forces the browser to evaluate and animate non-GPU properties (e.g., width, padding, border-width, margin) off-thread, causing dropped frames during interactive operations.
2. It animates unintended property changes (such as text wrapping or icon dimension shifts).

## Target

Replace `all` with explicit, hardware-accelerated and discrete property lists using tokenized easings (`var(--ease-out)` and `var(--ease-in-out)`):

```css
/* Target */
.cl-socialButtonsBlockButton {
  ...
  transition: background-color var(--duration-normal) var(--ease-out),
              border-color var(--duration-normal) var(--ease-out),
              color var(--duration-normal) var(--ease-out),
              box-shadow var(--duration-normal) var(--ease-out) !important;
}

.theme-transition {
  transition: background-color var(--duration-normal) var(--ease-in-out),
              border-color var(--duration-normal) var(--ease-in-out),
              color var(--duration-normal) var(--ease-in-out),
              box-shadow var(--duration-normal) var(--ease-in-out);
}

.theme-surface-card {
  ...
  transition: background-color var(--duration-normal) var(--ease-in-out),
              border-color var(--duration-normal) var(--ease-in-out),
              color var(--duration-normal) var(--ease-in-out),
              box-shadow var(--duration-normal) var(--ease-in-out);
}

.theme-btn-primary {
  ...
  transition: background-color var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out),
              filter var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}
```

## Repo conventions to follow

- Tokens defined in Plan 001 (`var(--ease-out)`, `var(--ease-in-out)`, `var(--duration-fast)`, `var(--duration-normal)`) must be used.
- Exemplar: `body` tag transition at `app/globals.css:198` explicitly lists `background-color` and `color`.

## Steps

1. In `app/globals.css:80`, replace `transition: all 0.2s ease !important;` with discrete properties:
   ```css
   transition: background-color var(--duration-normal) var(--ease-out),
               border-color var(--duration-normal) var(--ease-out),
               color var(--duration-normal) var(--ease-out),
               box-shadow var(--duration-normal) var(--ease-out) !important;
   ```
2. In `app/globals.css:375`, update `.theme-transition`:
   ```css
   .theme-transition {
     transition: background-color var(--duration-normal) var(--ease-in-out),
                 border-color var(--duration-normal) var(--ease-in-out),
                 color var(--duration-normal) var(--ease-in-out),
                 box-shadow var(--duration-normal) var(--ease-in-out);
   }
   ```
3. In `app/globals.css:408`, update `.theme-surface-card`:
   ```css
   transition: background-color var(--duration-normal) var(--ease-in-out),
               border-color var(--duration-normal) var(--ease-in-out),
               color var(--duration-normal) var(--ease-in-out),
               box-shadow var(--duration-normal) var(--ease-in-out);
   ```
4. In `app/globals.css:417`, update `.theme-btn-primary`:
   ```css
   transition: background-color var(--duration-fast) var(--ease-out),
               box-shadow var(--duration-fast) var(--ease-out),
               filter var(--duration-fast) var(--ease-out),
               transform var(--duration-fast) var(--ease-out);
   ```

## Boundaries

- Do NOT alter class names or existing layout rules.
- Do NOT touch component TSX markup.

## Verification

- **Mechanical**:
  - `npm run build` succeeds without errors.
  - Search `grep -rn "transition: all" app/globals.css` returns 0 results.
- **Feel check**:
  - Toggle between Theme 1, Theme 2, and Theme 3 in settings: color and background fades smoothly without any geometric jank or frame drops.
  - Primary buttons brighten and scale smoothly upon hover and press.
- **Done when**: Zero instances of `transition: all` remain in `app/globals.css`.
