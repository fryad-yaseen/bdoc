import { Button } from '@/components/ui/button'
import type { ApiOperation } from '@/lib/openapi'
import { MethodBadge } from '../shared/method-badge'

export function OperationHeader({
  operation,
  canSend,
  onSend,
}: {
  operation: ApiOperation
  canSend: boolean
  onSend: () => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <MethodBadge method={operation.method} />
            <code className="text-sm font-mono">{operation.path}</code>
          </div>
          <h2 className="text-base font-semibold">{operation.summary}</h2>
          {operation.description ? (
            <p className="max-w-3xl text-sm text-muted-foreground">
              {operation.description}
            </p>
          ) : null}
        </div>
        <Button
          disabled={!canSend}
          onClick={onSend}
          className="shrink-0"
        >
          Send
        </Button>
      </div>
    </div>
  )
}
