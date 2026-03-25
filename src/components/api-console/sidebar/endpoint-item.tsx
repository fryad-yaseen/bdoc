import type { ApiOperation } from '@/lib/openapi'
import { cn } from '@/lib/utils'
import { MethodBadge } from '../shared/method-badge'

export function EndpointItem({
  operation,
  selected,
  onClick,
}: {
  operation: ApiOperation
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      className={cn(
        'w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50',
        selected && 'border-l-2 border-l-primary bg-muted/40',
      )}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center gap-2">
        <MethodBadge method={operation.method} />
        <span className="truncate text-sm font-mono">{operation.path}</span>
      </div>
      {operation.summary ? (
        <p className="mt-1.5 line-clamp-2 pl-[4.5rem] text-xs text-muted-foreground">
          {operation.summary}
        </p>
      ) : null}
    </button>
  )
}
