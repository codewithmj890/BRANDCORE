/**
 * BRANDCORE — Button Component
 * Primary, accent, secondary, danger, and ghost variants with consistent sizing.
 * Built on design system CSS variables.
 */
import { forwardRef } from 'react'

const variants = {
  primary: 'btn-primary',
  accent: 'btn-accent',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export const Button = forwardRef(({ variant = 'primary', size = 'md', className = '', disabled, asChild, ...props }, ref) => {
  const baseClasses =
    variants[variant] + ' ' + sizes[size] + ' ' + className

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-disabled={disabled}
      className={baseClasses}
      {...props}
    />
  )
})

Button.displayName = 'Button'
