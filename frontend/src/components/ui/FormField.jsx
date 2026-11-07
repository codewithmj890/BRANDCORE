/**
 * BRANDCORE — FormField
 * Label, input, error message container with proper accessibility association.
 */

export function FormField({ label, name, error, required, children, helperText, className = '' }) {
  return (
    <div className={'mb-4 ' + className}>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-foreground dark:text-foreground-dark mb-1"
      >
        {label} {required && <span className="text-destructive dark:text-destructive ml-1">*</span>}
      </label>
      <div className="relative">
        {children}
        {error && (
          <p className="mt-1 text-xs text-destructive dark:text-destructive" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-muted-foreground-dark">{helperText}</p>
        )}
      </div>
    </div>
  )
}

export function FormInput({ id, className = '', ...props }) {
  return (
    <input
      id={id}
      className={
        'form-input ' + className
      }
      {...props}
    />
  )
}

export function FormTextarea({ id, className = '', rows = 4, ...props }) {
  return (
    <textarea
      id={id}
      rows={rows}
      className={
        'form-input resize-none ' + className
      }
      {...props}
    />
  )
}

export function FormSelect({ id, className = '', ...props }) {
  return (
    <select
      id={id}
      className={
        'form-input ' + className
      }
      {...props}
    />
  )
}
