/**
 * BRANDCORE — Card Component
 * Elevated surface container with consistent border and shadow.
 */
import { forwardRef } from 'react'

export const Card = forwardRef(function Card({ className = '', children, padding = 'p-6' }, ref) {
  return (
    <div
      ref={ref}
      className={
        'card ' +
        padding + ' ' + className
      }
    >
      {children}
    </div>
  )
})

export function CardHeader({ className = '', children }) {
  return <div className={'mb-5 ' + className}>{children}</div>
}

export function CardTitle({ className = '', children }) {
  return (
    <h3 className={'text-lg font-semibold text-foreground dark:text-foreground-dark ' + className}>{children}</h3>
  )
}

export function CardBody({ className = '', children }) {
  return <div className={className}>{children}</div>
}

export function CardFooter({ className = '', children }) {
  return (
    <div className={'mt-5 flex items-center gap-2 ' + className}>{children}</div>
  )
}
