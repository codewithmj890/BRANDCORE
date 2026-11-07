# Page Guidelines: Error Pages

> **Source:** `design-system/brandcore/MASTER.md` (Master rules apply unless overridden below)
> **Component:** HTTP Error Page System
> **Scope:** All error states and status pages

---

## Page-Specific Rules

### Layout
- **Full-page error:** Centered content, max-width `--space-xl`, within AppShell
- **Inline error:** Card-style, within page content flow
- **Error boundary:** Catches React errors, shows fallback UI

### Color Usage
- **Error icon:** Red (`--color-destructive`), never color-only
- **Error title:** `--color-foreground`, 1.125rem (18px), font-weight 600
- **Error message:** `--color-muted-foreground`, 0.875rem (14px)
- **Detail text:** `--color-muted-foreground`, 0.75rem (12px), monospace
- **Border:** Red-tinted (`--color-destructive` at low opacity)
- **Background:** Red-tinted at very low opacity

### Typography
- **Error heading:** Plus Jakarta Sans, 600, 1.125rem (18px), `--color-foreground`
- **Error message:** Plus Jakarta Sans, 400, 0.875rem (14px), `--color-text-secondary`
- **Retry button text:** Plus Jakarta Sans, 500, 0.875rem (14px)

### Components
- **ErrorPage:** Full-page error with icon, title, message, optional detail, retry action
- **ErrorBoundary:** React error boundary wrapper
- **InlineError:** Card-style error within page content
- **EmptyState:** Centered illustration + title + description + optional action
- **RetryAction:** Primary button, performs actual retry (not fake)

### Status Page Mapping
| Status | Name | Action | Retry |
|--------|------|--------|-------|
| 400 | Bad Request | Review submitted information | No |
| 401 | Unauthorized | Sign in only when genuinely signed out | No |
| 403 | Forbidden | Explain insufficient permissions | No |
| 404 | Not Found | Return to a valid application route | No |
| 408 | Request Timeout | Offer a safe retry | Yes |
| 409 | Conflict | Explain the conflict and resolution | No |
| 422 | Validation Error | Identify fields requiring correction | No |
| 429 | Too Many Requests | Respect retry timing | Yes (after delay) |
| 500 | Internal Server Error | Offer retry and request reference | Yes |
| 502 | Bad Gateway | Offer retry | Yes |
| 503 | Service Unavailable | Communicate temporary unavailability | Yes |
| 504 | Gateway Timeout | Offer a safe retry | Yes |

### Authentication Semantics (per project requirements)
- **401 must not automatically mean Clerk session expired**
- **Check actual Clerk authentication state** before showing sign-in
- **Distinguish:** missing token vs invalid token vs authenticated without workspace
- **Use onboarding** for authenticated users who need workspace provisioning
- **Use permission-specific message for 403**
- **Never show** backend stack traces, SQL errors or secret information
- **Attach request IDs** to relevant support-facing errors

### Responsive Behavior
- **Mobile:** Centered error card, full-width, padded
- **Tablet/Desktop:** Centered error card, max-width `--space-xl`

### Interactions
- **Retry button:** Performs actual API retry, shows loading state during retry
- **Return to route:** Link/button to navigate back to valid application route
- **Sign in:** Opens Clerk SignIn modal (only for genuine 401 when signed out)

---

## Override vs Master

| Rule | Master | Page Override |
|------|--------|---------------|
| Density | 5/10 Standard | 5/10 Standard |
| Motion | 3/10 Subtle | 3/10 Subtle |
| Error colors | N/A | Red/destructive palette |
| Retry semantics | N/A | Status-dependent |
