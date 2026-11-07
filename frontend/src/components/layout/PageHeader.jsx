/**
 * BRANDCORE — PageHeader
 * Consistent page heading with description, breadcrumbs, and action buttons.
 */
import { Breadcrumbs } from './Breadcrumbs'

export function PageHeader({ title, description, breadcrumbs, actions }) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground-dark">{title}</h1>
          {description && <p className="text-muted-foreground mt-1">{description}</p>}
        </div>
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  )
}
