# Page Guidelines: Loading States

> **Source:** `design-system/brandcore/MASTER.md` (Master rules apply unless overridden below)
> **Component:** Skeleton Loading System
> **Scope:** All pages and components

---

## Page-Specific Rules

### Layout
- **Application shell skeleton:** Sidebar skeleton + TopBar skeleton + content skeleton
- **Page skeletons:** Match final component geometry exactly (no layout shift)
- **Persistent shell:** AppShell remains visible during route data loading
- **No full-screen spinners:** Page-specific skeletons only

### Color Usage
- **Skeleton background:** `--color-muted` (light), `--color-secondary` (dark)
- **Skeleton animation:** Subtle pulse, 150-300ms cycle
- **No bright colors:** Skeletons are neutral, never use accent colors

### Typography
- **No text in skeletons:** Pure geometric placeholders
- **Line length variants:** 100%, 70%, 60%, 40% widths to mimic text lines

### Components
- **Skeleton:** Base primitive — rounded rect with `--color-muted` bg + animate-pulse
- **SkeletonText:** 3 lines, decreasing widths (100%, 70%, 60%)
- **SkeletonRow:** Avatar skeleton + two text lines (100%, 70%)
- **ApplicationShellSkeleton:** Full shell with sidebar + topbar + content placeholders
- **DashboardSkeleton:** Bento grid skeleton cards
- **ContentReviewSkeleton:** Form + versions + findings skeletons
- **DataTableSkeleton:** Table rows with cell skeletons
- **DetailPageSkeleton:** Card skeleton with header + body placeholders

### Responsive Behavior
- **Mobile:** Single column skeleton layout
- **Tablet/Desktop:** Multi-column skeleton matching page layout

### Interactions
- **Initial loading:** Show skeleton immediately, no delay
- **Background refreshing:** Show inline skeleton in content area only
- **Mutation loading:** Show button loading state (disabled + "Saving…")
- **No infinite spinner:** Always skeleton or specific loading indicator

### Motion Rules
- **Pulse animation:** 150-300ms cycle, ease-in-out
- **prefers-reduced-motion:** Disable pulse, show static skeleton
- **No layout shift:** Skeleton geometry matches final component exactly

---

## Override vs Master

| Rule | Master | Page Override |
|------|--------|---------------|
| Density | 5/10 Standard | 5/10 Standard |
| Motion | 3/10 Subtle | 3/10 Subtle |
| Animation | N/A | Pulse 150-300ms |
