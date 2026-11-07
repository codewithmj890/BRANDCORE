# BRANDCORE — Design System

**Version:** 0.5.0 · **Authority:** This document references the canonical design system at `design-system/brandcore/MASTER.md`.
**Direction:** Premium enterprise SaaS + navy/grey corporate + trust blue accent + Accessible & Ethical style.
Professional B2B brand governance workspace. Trustworthy, precise, evidence-first.
Not a generic AI chat UI and not a cinematic marketing page.

**Design seed:** Enterprise B2B service with Accessible & Ethical style (WCAG 2.2 AA target).
Single canonical source — all UI work references `design-system/brandcore/MASTER.md` and page-specific overrides in `design-system/brandcore/pages/`.

---

## Historical Design (v0.4.0 — Forest Green Editorial)

The previous design system used a forest-green editorial identity with deep forest-green primary (`#15803d`), warm neutral background, and system UI font stack. This has been retired in favor of the new enterprise navy/blue design system. The previous design is preserved here for historical reference only and is no longer the active specification.

### Previous Color Tokens (Retired)

| Role | Hex |
|------|-----|
| Primary (forest green) | `#15803d` |
| Background | `#F5F7FA` |
| Surface | `#FFFFFF` |
| Text primary | `#162638` |
| Text secondary | `#5C6D80` |
| Border | `#DCE3EA` |

---

## Canonical Design System (v0.5.0 — Active)

All active design specifications live in:

- **Master specification:** `design-system/brandcore/MASTER.md`
- **Page-specific overrides:** `design-system/brandcore/pages/`
  - `dashboard.md` — Workspace Overview / Dashboard
  - `content-review.md` — Content Review Workflow
  - `approved-facts.md` — Approved Facts Management
  - `evidence-library.md` — Evidence Library
  - `brand-policies.md` — Brand Policies Management
  - `terminology.md` — Terminology Management
  - `release-passports.md` — Release Passports / Release Governance
  - `workspace-settings.md` — Workspace Settings
  - `authentication.md` — Sign-in / Sign-up (Clerk)
  - `loading-states.md` — Skeleton Loading System
  - `error-pages.md` — HTTP Error Page System

### Light Mode Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#0F172A` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#334155` | `--color-secondary` |
| On Secondary | `#FFFFFF` | `--color-on-secondary` |
| Accent/CTA | `#0369A1` | `--color-accent` |
| On Accent/CTA | `#FFFFFF` | `--color-on-accent` |
| Background | `#F8FAFC` | `--color-background` |
| Foreground | `#020617` | `--color-foreground` |
| Card | `#FFFFFF` | `--color-card` |
| Card Foreground | `#020617` | `--color-card-foreground` |
| Muted | `#E8ECF1` | `--color-muted` |
| Muted Foreground | `#475569` | `--color-muted-foreground` |
| Border | `#E2E8F0` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| On Destructive | `#FFFFFF` | `--color-on-destructive` |
| Ring | `#0F172A` | `--color-ring` |

### Dark Mode Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Canvas | `#0A0E16` | `--color-canvas` |
| Surface | `#121826` | `--color-surface` |
| Surface Muted | `#182130` | `--color-surface-muted` |
| Surface Elevated | `#1C2436` | `--color-surface-elevated` |
| Primary | `#F8FAFC` | `--color-primary` |
| On Primary | `#020617` | `--color-on-primary` |
| Secondary | `#94A3B8` | `--color-secondary` |
| On Secondary | `#020617` | `--color-on-secondary` |
| Accent | `#38BDF8` | `--color-accent` |
| On Accent | `#020617` | `--color-on-accent` |
| Foreground | `#F8FAFC` | `--color-foreground` |
| Muted Foreground | `#9CA3AF` | `--color-muted-foreground` |
| Border | `#2A3346` | `--color-border` |
| Destructive | `#F87171` | `--color-destructive` |
| On Destructive | `#020617` | `--color-on-destructive` |
| Ring | `#60A5FA` | `--color-ring` |

**Dark Mode Design Principles:**
- Deep navy surfaces, not pure black — avoids visual heaviness
- Layered surface hierarchy (canvas < surface < surface-muted < surface-elevated)
- Subtle borders for separation, not excessive contrast
- Improved muted text contrast for readability
- Brighter focus ring for dark mode visibility

---

## Typography

- **Heading Font:** Plus Jakarta Sans
- **Body Font:** Plus Jakarta Sans
- **Google Fonts:** `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap`

### Style

- **Name:** Accessible & Ethical
- **WCAG Target:** 2.2 AA
- **Key Effects:** Clear focus rings (3-4px), ARIA labels, skip links, responsive design, reduced motion, 44x44px touch targets

### Design Dials

- Variance: 4/10 (Balanced / Modern)
- Motion: 3/10 (Subtle)
- Density: 5/10 (Standard)

---

## Border Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-xs` | `8px` | Tiny elements, micro badges |
| `--radius-sm` | `10px` | Small elements, compact badges |
| `--radius-md` | `14px` | Default, form inputs, select controls, primary buttons, secondary buttons, dropdowns, sidebar nav items |
| `--radius-lg` | `18px` | Cards, elevated panels |
| `--radius-xl` | `22px` | Dialogs, modals |
| `--radius-2xl` | `26px` | Large promotional surfaces |
| `--radius-pill` | `9999px` | Pills, circular buttons, avatars |
| `--radius-circle` | `50%` | Perfect circles (menu button) |

**Component Radius Mapping:**

| Component | Radius | Value |
|-----------|--------|-------|
| Cards | `--radius-lg` | 18px |
| Primary buttons | `--radius-md` | 14px |
| Secondary buttons | `--radius-md` | 14px |
| Text inputs | `--radius-md` | 14px |
| Select controls | `--radius-md` | 14px |
| Dialogs | `--radius-xl` | 22px |
| Dropdowns | `--radius-md` | 14px |
| Sidebar navigation items | `--radius-md` | 14px |
| Badges | `--radius-pill` or `--radius-md` | pill or compact |
| Menu button | `--radius-circle` | 50% (perfect circle, 44px) |

---

## Navigation and Application Layout

The application shell consists of:
- **TopBar:** Sticky header with workspace identity, backend status, theme toggle, Clerk auth controls
- **Sidebar:** Collapsible navigation (256px expanded / 72px collapsed), active state indicators
- **MainContent:** Flex-1 content area with sidebar offset
- **MobileNavigation:** Overlay drawer with Escape-to-close and backdrop click

### Stacking Context (z-index)

| Layer | z-index | Use |
|-------|---------|-----|
| Base content | 0 | Page content |
| Sidebar | 40 | Fixed sidebar (desktop) |
| Top bar | 50 | Sticky header |
| Dropdown | 20 | Dropdown menus |
| Popover | 30 | Popovers |
| Drawer | 40 | Drawers |
| Modal | 50 | Modals/dialogs |
| Toast | 60 | Toast notifications |
| Tooltip | 70 | Tooltips |

Do not use arbitrary `z-index: 9999`. Use the established layers above.

---

## Menu Button (Circular Hamburger)

| Property | Value |
|----------|-------|
| Shape | Perfect circle |
| Width / Height | 44px |
| Border radius | 50% |
| Icon | Menu (three horizontal lines) |
| Icon size | 24px |
| Alignment | Centered (flex items-center justify-center) |
| Padding | 0 |
| Placement | Top navigation bar, immediately before BRANDCORE logo |
| Desktop behavior | Toggles sidebar collapse/expand (hamburger icon in both states) |
| Mobile behavior | Toggles drawer open/close (hamburger when closed, X when open) |

---

## Core Components

All shared components live in `src/components/ui/`:
- Button, Card, DataTable, EmptyState, ErrorState, FormField, Skeleton, StatusBadge, ThemeToggle, ThemeProvider
- Layout: AppShell, Sidebar, TopBar, Breadcrumbs, PageHeader

### Status Badge

| Status | Light BG | Light Text | Dark BG | Dark Text |
|--------|----------|------------|---------|-----------|
| Valid / Approved | `bg-green-100` | `text-green-700` | `bg-green-900/20` | `text-green-400` |
| Stale | `bg-amber-100` | `text-amber-700` | `bg-amber-900/20` | `text-amber-400` |
| Revoked / Rejected / Invalid | `bg-red-100` | `text-red-700` | `bg-red-900/20` | `text-red-400` |
| Pending | `bg-surface-muted` | `text-slate-700` | `bg-surface-muted` | `text-slate-500` |

Always include a text label alongside color. Never use color as the only signal.

### Button

| Variant | Background | Text | Hover | Focus |
|---------|-----------|------|-------|-------|
| Primary | `bg-primary` | `text-on-primary` | `bg-primary/90` | `ring-ring` |
| Accent | `bg-accent` | `text-on-accent` | `bg-accent/90` | `ring-ring` |
| Secondary | `bg-surface` | `text-foreground` | `bg-surface-muted` | `ring-ring` |
| Danger | `bg-destructive` | `text-on-destructive` | `bg-destructive/90` | `ring-ring` |
| Ghost | transparent | `text-muted-foreground` | `bg-surface-muted` | `ring-ring` |

All buttons use `--radius-md` (16px) and focus-ring with `--color-ring`.

---

## Component States

Every interactive component must have all applicable states: Default, Hover, Focus-visible, Disabled, Loading, Empty, Error, Success.

---

## WCAG 2.2 AA Target

- All text meets 4.5:1 contrast ratio (3:1 for large text ≥18px or bold ≥14px).
- Every interactive element is keyboard accessible with visible focus indicator.
- Focus order follows visual reading order.
- No information conveyed by color alone — always include text labels.
- Form inputs have associated labels.
- Error messages identify the field and describe the error.
- Sidebar toggle has `aria-expanded`, `aria-controls`, accessible name, keyboard support.
- Mobile drawer has Escape-to-close, backdrop click, focus management, body scroll lock.

Verify with axe on the deployed build. Do not claim WCAG AA compliance until verified.

---

## Responsive Behavior

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | < 1024px | Sidebar hidden from grid; hamburger menu controls overlay drawer |
| Desktop | ≥ 1024px | Sidebar 256px expanded / 72px collapsed; hamburger toggles collapse |

Sidebar collapsed width: 72px (icon only, tooltips on hover).
Sidebar expanded width: 256px (icons + labels).
Page horizontal padding: 28px to 32px (px-6 md:px-8 lg:px-10).

---

## Dark Mode

- **Theme provider:** Centralized `ThemeProvider` with class-based dark mode (`dark` class on `document.documentElement`)
- **Persistence:** `localStorage` key `brandcore-theme`
- **System preference:** `prefers-color-scheme` respected when no manual preference
- **Initialization:** Theme applied before UI renders via `ThemeProvider` — no flash of incorrect theme
- **Theme toggle:** Working toggle in main navigation (TopBar), 44px circular button matching menu button
- **Consistency:** Dark mode applied across every page, dialog, dropdown, and Clerk component
- **No CSS inversion:** Semantic tokens used, not `invert()` or `filter`
- **Deep navy surfaces:** Canvas `#0A0E16`, surface `#121826`, border `#2A3346` — layered, not flat black

---

## Motion Rules

- All transitions and animations use `ease-out` or `ease-in-out` timing
- Sidebar collapse/expand: `duration-300 ease-in-out` on width and transform
- Mobile drawer slide: `duration-300 ease-in-out` on transform
- Fade-in for page content: `duration-200 ease-out`
- No animated backgrounds, marquee text, or decorative motion
- `prefers-reduced-motion: reduce`: All animations reduced to 0.01ms duration

---

## What Not to Do

- No generic compliance score widget
- No elaborate onboarding animations
- No gradient hero sections
- No cinematic scroll effects
- No large UI component libraries without an ADR
- No separate color palette or component system per feature
- No `z-index: 9999` — use established stacking layers
- No hardcoded workspace IDs (`ws_demo`) — workspace resolved from Clerk org context
- No silent demo fallback on auth errors (401/403)
- No emojis as icons — use SVG icons
- No AI purple/pink gradients
- No playful design
- No layout-shifting hovers
- No invisible focus states
- No CSS filters to generate dark mode
- No excessively bright surface differences in dark mode
