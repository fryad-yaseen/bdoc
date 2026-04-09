import type { ApiOperation } from '@/lib/openapi'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
  const fallbackSummary = `${operation.method.toUpperCase()} ${operation.path}`
  const showSecondaryPath = operation.summary.trim().length > 0 && operation.summary !== fallbackSummary

  return (
    <TooltipProvider delay={400}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              className={cn(
                'w-full border-l border-transparent px-2 py-1.5 text-left transition-colors hover:bg-accent/50',
                selected && 'border-l-primary bg-accent',
              )}
              onClick={onClick}
              type="button"
            />
          }
        >
          <div className="flex items-center gap-2">
            <MethodBadge method={operation.method} className="h-4 w-12 text-[10px]" />
            <span className="truncate text-[12px] font-medium">
              {showSecondaryPath ? operation.summary : operation.path}
            </span>
          </div>
          {showSecondaryPath ? (
            <p className="mt-1 truncate pl-14 text-[11px] text-muted-foreground">
              {operation.path}
            </p>
          ) : null}
        </TooltipTrigger>
        <TooltipContent className="max-w-md whitespace-pre-wrap break-all">
          {operation.path}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
