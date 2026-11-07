# Page Guidelines: Approved Facts

> **Source:** `design-system/brandcore/MASTER.md` (Master rules apply unless overridden below)
> **Page:** Approved Facts Management
> **Route:** `/facts` (mapped to `activePage === 'facts'`)

---

## Page-Specific Rules

### Layout
- **Pattern:** Search/filter toolbar above a full-width data table
- **Sidebar:** Expanded by default; active item = `facts`
- **Table:** Full width, horizontal scroll on mobile, sticky header
- **Filter row:** Search input + status filter dropdown, inline, responsive

### Color Usage
- **Status badges:** Active = green, Superseded = amber, Retracted = gray
- **Evidence indicator:** Green dot for linked evidence, gray text for none
- **Expiry warnings:** Red text for expired facts, amber for expiring soon
- **Search/filter:** Muted colors for inputs, primary border on focus

### Typography
- **Page title:** Plus Jakarta Sans, 700, 1.5rem (24px), `--color-primary`
- **Fact claim text:** Plus Jakarta Sans, 500, 0.9375rem (15px), `--color-foreground`
- **Fact metadata:** Plus Jakarta Sans, 400, 0.8125rem (13px), `--color-muted-foreground`
- **Table headers:** Plus Jakarta Sans, 500, 0.75rem (12px), `--color-secondary`, uppercase, tracking-wider
- **Summary metrics:** Plus Jakarta Sans, 700, 1.5rem (24px), `--color-primary`

### Components
- **Data table:** Full-width, border `--color-border`, row hover `--color-muted`
- **Create fact dialog:** Modal (Dialog component), form fields stacked vertically
- **Edit fact dialog:** Same as create, pre-populated with existing values
- **Search input:** `--space-md` padding, border `--color-border`, focus ring `--color-ring`
- **Status filter:** Select control, small size, border `--color-border`

### Responsive Behavior
- **Mobile:** Table scrolls horizontally, filter row stacks vertically
- **Tablet:** Table full width, filter row inline
- **Desktop:** Table full width with all columns visible

### Interactions
- **Row click:** Navigates to fact detail (visual only — no detail route implemented)
- **Edit button:** Opens edit dialog with pre-populated form
- **Search:** Debounced, filters client-side
- **Status filter:** Immediate client-side filter

---

## Override vs Master

| Rule | Master | Page Override |
|------|--------|---------------|
| Density | 5/10 Standard | 5/10 Standard |
| Layout | N/A | Toolbar + full-width table |
| Table row hover | N/A | `--color-muted` background |
