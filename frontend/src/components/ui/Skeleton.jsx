/**
 * BRANDCORE — Loading Skeleton
 * Skeleton placeholders for content loading states.
 */
export function Skeleton({ className = '', width = '100%', height = '16px' }) {
  return (
    <div
      className={
        'skeleton ' + className
      }
      style={{ width, height }}
    />
  )
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={'flex flex-col gap-3 ' + className}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height="16px"
        />
      ))}
    </div>
  )
}

export function SkeletonRow({ className = '' }) {
  return (
    <div className={'flex items-center gap-4 py-3 ' + className}>
      <Skeleton width="48px" height="48px" className="rounded-full" />
      <div className="flex-1">
        <Skeleton width="100%" height="16px" />
        <Skeleton width="70%" height="16px" className="mt-2" />
      </div>
    </div>
  )
}
