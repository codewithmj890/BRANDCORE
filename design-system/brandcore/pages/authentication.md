# Page Guidelines: Authentication

> **Source:** `design-system/brandcore/MASTER.md` (Master rules apply unless overridden below)
> **Page:** Sign-in / Sign-up (Clerk)
> **Route:** Authentication states handled in `App.jsx`

---

## Page-Specific Rules

### Layout
- **Pattern:** Centered authentication panel within AppShell, max-width `--space-xl`
- **Sign-in:** Email/password via Clerk UserButton + SignIn modal
- **Sign-up:** Email/password via Clerk UserButton + SignUp modal
- **Organization selection:** Clerk OrganizationSwitcher in TopBar

### Color Usage
- **Clerk components:** Styled to match design system colors via appearance props
- **Sign-in button:** Primary (`--color-accent` background, white text)
- **Sign-up button:** Secondary (transparent, `--color-primary` border)
- **Error messages:** Red/destructive, never color-only

### Typography
- **Authentication heading:** Plus Jakarta Sans, 700, 1.5rem (24px), `--color-foreground`
- **Authentication description:** Plus Jakarta Sans, 400, 0.875rem (14px), `--color-muted-foreground`
- **Button text:** Plus Jakarta Sans, 500, 0.875rem (14px), white (primary) or `--color-primary` (secondary)

### Components
- **Clerk UserButton:** Custom appearance to match design system
- **Clerk OrganizationSwitcher:** Custom appearance to match design system
- **Sign-in/Sign-up modals:** Clerk default, styled via appearance props
- **Loading state:** Centered spinner or skeleton within AppShell

### Responsive Behavior
- **Mobile:** Full-width authentication panel
- **Tablet:** Centered panel with max-width
- **Desktop:** Centered panel with max-width

### Interactions
- **Sign in:** Opens Clerk SignIn modal
- **Sign up:** Opens Clerk SignUp modal
- **Organization switch:** Opens Clerk OrganizationSwitcher dropdown
- **Sign out:** Via Clerk UserButton menu

### Authentication Semantics (per project requirements)
- **401 from backend:** Does NOT automatically mean Clerk session expired — check actual Clerk auth state
- **Distinguish:** Missing token vs invalid token vs authenticated without workspace mapping
- **Workspace onboarding:** For authenticated users who need workspace provisioning
- **403:** Permission-specific message, not session expired

---

## Override vs Master

| Rule | Master | Page Override |
|------|--------|---------------|
| Density | 5/10 Standard | 5/10 Standard |
| Layout | N/A | Centered auth panel |
| Clerk styling | N/A | Custom appearance props |
