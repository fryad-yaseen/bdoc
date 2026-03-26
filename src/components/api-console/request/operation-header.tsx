import { Button } from '@/components/ui/button'
import type { ApiOperation } from '@/lib/openapi'
import { MethodBadge } from '../shared/method-badge'

export function OperationHeader({
  operation,
  canSend,
  isSending,
  onSend,
}: {
  operation: ApiOperation
  canSend: boolean
  isSending: boolean
  onSend: () => void
}) {
  const fallbackSummary = `${operation.method.toUpperCase()} ${operation.path}`
  const showSummary = operation.summary.trim().length > 0 && operation.summary !== fallbackSummary

  return (
    <div className="space-y-3 border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <MethodBadge method={operation.method} className="h-6 w-16" />
            <code className="text-sm font-semibold">{operation.path}</code>
          </div>
          {showSummary ? (
            <h2 className="text-sm font-semibold">{operation.summary}</h2>
          ) : null}
          {operation.description ? (
            <p className="max-w-4xl text-xs text-muted-foreground">
              {operation.description}
            </p>
          ) : null}
        </div>
        <Button
          disabled={!canSend || isSending}
          onClick={onSend}
          className="ml-auto h-9 shrink-0 self-center px-5"
        >
          {isSending ? (
            <span className="inline-flex items-center gap-2">
              <span className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
              Sending
            </span>
          ) : (
            'Send'
          )}
        </Button>
      </div>
    </div>
  )
}
