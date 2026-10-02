# Genra — DESIGN.md

Design tokens and rules for the Genra interface. This file is the **source of truth for colour, typography, spacing, radius, elevation and motion defaults**. Implement it in `app/globals.css` and the Tailwind theme during Phase 00, and reference tokens everywhere. Never hard-code hex values in components.

## 1. Design principles

1. **Monochrome first.** The interface is soft black and white. Purple is a seasoning, not the meal.
2. **The work is the hero.** Creations (screenshots, images, video) carry the colour and visual interest. The UI chrome stays quiet so the media can stand out.
3. **Clean, modern, minimal.** Generous whitespace, thin borders, restrained shadows, clear hierarchy through type size and weight rather than decoration.
4. **Light by default, dark supported.** Both themes are first-class and designed together, not inverted afterwards.
5. **Readable and accessible.** Text meets WCAG AA contrast, focus is always visible, motion respects `prefers-reduced-motion`.

## 2. Brand colour: lavender purple `#774CFF`

The brand colour is used rarely and deliberately. Target mix on any screen: roughly **90%+ neutral, under 10% purple**.

### Brand scale

| Token           | Hex           | Notes                                               |
| --------------- | ------------- | --------------------------------------------------- |
| `brand-50`      | `#F4F0FF`     | Tint backgrounds                                    |
| `brand-100`     | `#EAE3FF`     | Selected/soft fills                                 |
| `brand-200`     | `#D8CBFF`     | Soft borders                                        |
| `brand-300`     | `#BDA6FF`     |                                                     |
| `brand-400`     | `#9D7BFF`     | Brand text and rings on dark backgrounds            |
| **`brand-500`** | **`#774CFF`** | **Primary brand colour, filled accents**            |
| `brand-600`     | `#6236E6`     | Hover/pressed fill; brand text on light backgrounds |
| `brand-700`     | `#4F28BF`     |                                                     |
| `brand-800`     | `#3F2296`     |                                                     |
| `brand-900`     | `#2F1A70`     |                                                     |
| `brand-950`     | `#1D1048`     |                                                     |

The intermediate steps are derived around `#774CFF` as a starting point; adjust them by eye if needed, but keep `brand-500` exactly `#774CFF`.

### Where purple is allowed

- The **single most important action** in a view (Publish, Sign up).
- **Focus rings** (keyboard focus).
- **Selected or active indicators**: active tab underline, selected filter chip dot, liked/saved state icon, active nav marker.
- **Links** inside long-form text (`brand-600` in light, `brand-400` in dark), and small inline highlights.
- Tiny accents: the logo mark, an unread/new dot, progress bars, key empty-state illustrations.

### Where purple is not allowed

- Large background areas, full-width banners, headers or footers.
- Default card borders, section dividers or body text.
- More than one filled purple button visible at once.
- Gradients, glows, blurred colour blobs, or glassmorphism. These read as generic "AI product" styling and are out of scope.
- Category or kind colour-coding. Categories, resource kinds and tool chips are neutral.

### Contrast notes (approximate, verify with a tool)

- White text on `brand-500` is about 4.9:1, which passes AA for normal text.
- `brand-500` text on a near-black dark background is about 4:1 and fails for small text, so **use `brand-400` for brand-coloured text in dark mode**.
- `brand-600` on white is about 6.6:1 and is the link colour in light mode.

## 3. Colour tokens

Implemented as CSS variables. Names follow shadcn/ui so its components work without rewriting; Genra-specific tokens are added alongside.

> **Important:** in shadcn/ui, `--accent` means a _neutral hover surface_, not the brand colour. Genra's purple is exposed as `--brand*`. Do not map `--accent` to purple.

```css
/* app/globals.css */
:root {
  /* Neutrals */
  --background: #ffffff;
  --foreground: #111113; /* soft black, never pure #000 */
  --card: #ffffff;
  --card-foreground: #111113;
  --popover: #ffffff;
  --popover-foreground: #111113;

  /* Default action colour is soft black (monochrome) */
  --primary: #111113;
  --primary-foreground: #fafafa;
  --secondary: #f4f4f5;
  --secondary-foreground: #111113;
  --muted: #f4f4f5;
  --muted-foreground: #5f5f68; /* ~6.3:1 on white */
  --accent: #f4f4f5; /* neutral hover surface */
  --accent-foreground: #111113;

  --border: #e8e8eb;
  --input: #e8e8eb;
  --ring: #774cff; /* focus ring uses the brand colour */

  /* Genra surfaces and text */
  --surface: #fafafa; /* page sections, subtle panels */
  --surface-2: #f4f4f5;
  --border-strong: #d4d4d8;
  --text-subtle: #72727c; /* metadata, placeholders (~4.7:1) */

  /* Brand */
  --brand: #774cff;
  --brand-foreground: #ffffff;
  --brand-hover: #6236e6;
  --brand-soft: #f4f0ff; /* tint background */
  --brand-soft-foreground: #4f28bf;
  --brand-text: #6236e6; /* links and brand-coloured text */

  /* Semantic (muted, used sparingly) */
  --destructive: #d92d20;
  --destructive-soft: #fef3f2;
  --success: #067647;
  --success-soft: #ecfdf3;
  --warning: #b54708;
  --warning-soft: #fffaeb;

  /* Shape */
  --radius: 0.75rem; /* 12px base */
}

.dark {
  --background: #0b0b0d;
  --foreground: #f4f4f5;
  --card: #111114;
  --card-foreground: #f4f4f5;
  --popover: #141417;
  --popover-foreground: #f4f4f5;

  --primary: #f4f4f5;
  --primary-foreground: #111113;
  --secondary: #1a1a1e;
  --secondary-foreground: #f4f4f5;
  --muted: #1a1a1e;
  --muted-foreground: #a1a1aa;
  --accent: #1f1f24;
  --accent-foreground: #f4f4f5;

  --border: #26262b;
  --input: #2a2a30;
  --ring: #9d7bff;

  --surface: #0f0f12;
  --surface-2: #1a1a1e;
  --border-strong: #35353c;
  --text-subtle: #8a8a93;

  --brand: #774cff; /* fills stay the same; white text passes */
  --brand-foreground: #ffffff;
  --brand-hover: #8a66ff;
  --brand-soft: #1c1633;
  --brand-soft-foreground: #bda6ff;
  --brand-text: #9d7bff; /* brand text on dark must be lighter */

  --destructive: #f97066;
  --destructive-soft: #2a1514;
  --success: #47cd89;
  --success-soft: #0f2418;
  --warning: #fec84b;
  --warning-soft: #2a2008;
}
```

### Tailwind mapping (Tailwind v4 style; adapt to the installed version)

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-border-strong: var(--border-strong);
  --color-subtle: var(--text-subtle);

  --color-brand: var(--brand);
  --color-brand-foreground: var(--brand-foreground);
  --color-brand-hover: var(--brand-hover);
  --color-brand-soft: var(--brand-soft);
  --color-brand-soft-foreground: var(--brand-soft-foreground);
  --color-brand-text: var(--brand-text);

  --radius-sm: calc(var(--radius) - 6px); /* 6px */
  --radius-md: calc(var(--radius) - 4px); /* 8px */
  --radius-lg: var(--radius); /* 12px */
  --radius-xl: calc(var(--radius) + 4px); /* 16px */
  --radius-2xl: calc(var(--radius) + 12px); /* 24px */

  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace;
}
```

The raw brand scale (`brand-50` to `brand-950`) can also be registered as `--color-brand-50` and so on for rare cases that need a specific step.

## 4. Theme behaviour

- **Light is the default.** Use `next-themes` (or equivalent) with the `class` strategy, `defaultTheme="light"` and `enableSystem={false}`, so first-time visitors always see light.
- A theme toggle (light / dark) lives in the user menu and in the footer for signed-out visitors. The choice is remembered.
- No flash of the wrong theme on load (set the class before paint).
- Both themes must be checked for every component. Media (screenshots) are never recoloured or dimmed by theme.

## 5. Typography

**Font: Geist.** Geist Sans for all UI and content, Geist Mono for prompts, code, tool versions and technical metadata.

Load through `next/font` (the `geist` package or `next/font/google`) and expose the variables `--font-geist-sans` and `--font-geist-mono` on `<html>`. Enable `font-display: swap`. Do not add a second typeface.

### Type scale

| Token     | Size / line height            | Weight    | Letter spacing | Use                       |
| --------- | ----------------------------- | --------- | -------------- | ------------------------- |
| `display` | 48px / 52px (36/40 on mobile) | 600       | -0.03em        | Home hero only            |
| `h1`      | 36px / 40px (30/36 on mobile) | 600       | -0.025em       | Page titles               |
| `h2`      | 28px / 34px                   | 600       | -0.02em        | Section titles            |
| `h3`      | 22px / 28px                   | 600       | -0.015em       | Card group titles         |
| `h4`      | 18px / 26px                   | 600       | -0.01em        | Subsections               |
| `body-lg` | 18px / 28px                   | 400       | 0              | Intro text, descriptions  |
| `body`    | 16px / 26px                   | 400       | 0              | Default text              |
| `small`   | 14px / 20px                   | 400 / 500 | 0              | Metadata, labels, buttons |
| `xs`      | 12px / 16px                   | 500       | 0.01em         | Badges, captions          |
| `mono`    | 13px / 20px                   | 400       | 0              | Prompts, code             |

Rules:

- Hierarchy comes from size and weight, using only 400, 500 and 600. No bold 700+.
- Body copy line length stays between 60 and 75 characters.
- Use `text-balance` on headings and `text-pretty` on paragraphs.
- Numbers in counts and metrics use tabular numerals (`font-variant-numeric: tabular-nums`).

## 6. Spacing and layout

- **Base unit 4px.** Use the Tailwind spacing scale; prefer 4, 8, 12, 16, 24, 32, 48, 64, 96.
- **Page container:** max width 1280px, horizontal padding 16px (mobile), 24px (tablet), 32px (desktop). Reading content (creation description, process) max width 720px.
- **Section spacing:** 64px to 96px between major home-page sections; 32px to 48px inside pages.
- **Creation grid:** 1 column (mobile), 2 (≥640px), 3 (≥1024px), 4 (≥1440px), gap 24px.
- **Breakpoints:** Tailwind defaults (`sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`). Design mobile first.
- **Touch targets:** at least 44px high for primary controls on mobile.

## 7. Shape and elevation

| Token         | Value  | Use                       |
| ------------- | ------ | ------------------------- |
| `radius-sm`   | 6px    | Chips, small inputs       |
| `radius-md`   | 8px    | Buttons, inputs           |
| `radius-lg`   | 12px   | Cards, dialogs            |
| `radius-xl`   | 16px   | Large cards, media frames |
| `radius-2xl`  | 24px   | Hero containers           |
| `radius-full` | 9999px | Avatars, pills            |

Borders are 1px and do most of the separation work. Shadows are rare and soft.

```css
:root {
  --shadow-xs: 0 1px 2px rgb(17 17 19 / 0.04);
  --shadow-sm: 0 1px 3px rgb(17 17 19 / 0.06), 0 1px 2px rgb(17 17 19 / 0.04);
  --shadow-md: 0 8px 24px -8px rgb(17 17 19 / 0.12); /* popovers, menus */
  --shadow-lg: 0 24px 48px -16px rgb(17 17 19 / 0.18); /* dialogs */
}
.dark {
  --shadow-xs: none;
  --shadow-sm: none;
  --shadow-md: 0 8px 24px -8px rgb(0 0 0 / 0.5);
  --shadow-lg: 0 24px 48px -16px rgb(0 0 0 / 0.6);
}
```

In dark mode, rely on borders and surface steps (`background` → `card` → `surface-2`) rather than shadows.

**Z-index scale:** base 0, sticky header 40, dropdown/popover 50, dialog overlay 60, dialog 70, toast 80.

## 8. Motion

Motion is small, quick and purposeful. For detailed animation craft and patterns, follow the **emil-design-eng** skill; the values below are the baseline tokens.

```css
:root {
  --duration-fast: 120ms; /* hover, press, colour changes */
  --duration-base: 200ms; /* menus, popovers, toggles */
  --duration-slow: 320ms; /* dialogs, page-level transitions */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
}
```

- Animate `transform` and `opacity` only; avoid animating layout properties.
- Enter animations use ease-out; do not delay interactions.
- Buttons give a subtle press response (scale ~0.98) in `--duration-fast`.
- Respect `prefers-reduced-motion: reduce` by removing movement and keeping only simple fades.
- No looping decorative animations, parallax, or scroll-jacking.

## 9. Iconography and imagery

- **Icons:** `lucide-react`, 16px (inline), 20px (controls), stroke width 1.75, colour inherits the text colour. Filled purple is used only for an active liked/saved state.
- **Imagery:** media is shown at its natural aspect ratio where possible; creation cards use a fixed ratio (4:3) with `object-cover`, `radius-lg`, and a 1px inner border so light images don't bleed into a white page.
- **Avatars:** circular, 24/32/40/64px, initials fallback on `surface-2`.
- **Empty states:** simple monochrome line illustration or icon plus one sentence and one action. No stock illustrations.

## 10. Component guidelines

**Buttons**

| Variant           | Style                                                | Use                                            |
| ----------------- | ---------------------------------------------------- | ---------------------------------------------- |
| Primary (default) | `primary` soft-black fill, `primary-foreground` text | Standard actions                               |
| Brand             | `brand` fill, white text, `brand-hover` on hover     | The one key action per view (Publish, Sign up) |
| Secondary         | `secondary` fill, 1px `border`                       | Secondary actions                              |
| Outline           | transparent, 1px `border`                            | Tertiary                                       |
| Ghost             | transparent, `accent` on hover                       | Toolbars, icon buttons                         |
| Destructive       | `destructive` text or fill                           | Delete, remove                                 |

Heights 32 / 36 / 40 / 44px, radius-md, 500 weight, 14px text.

**Cards (creation card):** `card` background, 1px `border`, radius-lg, no shadow at rest; on hover the border moves to `border-strong` and the media scales very slightly (no more than 1.02). Content below the media: title (14–16px, 500), creator row, tool chips, counts in `text-subtle`.

**Chips and badges (tools, tags, kinds):** neutral `secondary` background, 1px `border`, radius-sm or full, 12px text, optional 14px tool icon. Never colour-coded. A selected filter chip uses `foreground`-on-`background` inversion or a small `brand` dot, not a full purple fill.

**Inputs:** 40px height, `input` border, radius-md, `background` fill, placeholder in `text-subtle`; focus shows a 2px `ring` with 2px offset.

**Tabs:** text tabs with a 2px underline in `brand` for the active tab; inactive tabs in `muted-foreground`.

**Dialogs and popovers:** `popover` background, 1px `border`, radius-lg, `shadow-lg` / `shadow-md`; overlay is `foreground` at 40% opacity (light) or black at 60% (dark).

**Toasts:** neutral card style, bottom-centre on mobile and bottom-right on desktop.

**Skeletons:** `surface-2` blocks with a subtle fade pulse; match the final layout to avoid layout shift.

**Process timeline:** a 1px vertical `border` line with 8px nodes in `foreground`; the current or hovered node may use `brand`.

**Prompt block:** `mono` text on `surface` background, 1px `border`, radius-lg, with a ghost "Copy" button; no syntax colours beyond neutral tones.

**Code and links:** inline code on `surface-2` with radius-sm; links use `brand-text` with underline on hover.

## 11. Accessibility

- All text meets WCAG 2.1 AA contrast in both themes.
- Focus is always visible: 2px `ring` with 2px offset on every interactive element. Never remove outlines without replacement.
- Colour is never the only signal (for example a liked state also changes the icon fill and label).
- Respect `prefers-reduced-motion` and `prefers-color-scheme` where relevant (theme default stays light).
- Provide `alt` text for media, labels for inputs, and `aria-live` for toasts and async status.

## 12. Do and don't summary

| Do                                              | Don't                                    |
| ----------------------------------------------- | ---------------------------------------- |
| Use soft black `#111113` and off-white surfaces | Use pure `#000000` or heavy greys        |
| Keep purple to one key action and small accents | Fill large areas with purple             |
| Separate with 1px borders and whitespace        | Stack heavy shadows                      |
| Let creation media provide the colour           | Add decorative gradients, glows or blobs |
| Use Geist with 400/500/600 weights              | Mix in other fonts or use heavy bold     |
| Keep chips and badges neutral                   | Colour-code categories or kinds          |
| Use short, purposeful motion                    | Add looping or decorative animation      |

## 13. Phase 00 implementation checklist

- [x] Add the CSS variables above to `app/globals.css` and map them in the Tailwind theme.
- [x] Load Geist Sans and Geist Mono with `next/font` and apply the variables on `<html>`.
- [x] Configure the theme provider (light default, `class` strategy, no system override) and add the theme toggle.
- [x] Align shadcn/ui component styles with the tokens (buttons, inputs, cards, dialogs, tabs, badges).
- [x] Create a hidden `/design` page (development only) showing the palette, type scale, buttons, inputs, cards, chips and states in both themes.
- [x] Verify contrast for text, links and focus rings in both themes.
