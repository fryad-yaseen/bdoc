import { Input } from '@/components/ui/input'
import type { ApiOperation, NormalizedSpec } from '@/lib/openapi'

export function AuthSection({
  authToken,
  onAuthTokenChange,
  operation,
  spec,
}: {
  authToken: string
  onAuthTokenChange: (token: string) => void
  operation: ApiOperation
  spec: NormalizedSpec
}) {
  return (
    <div className="space-y-2 border border-border bg-card p-3">
      <Input
        value={authToken}
        onChange={(event) => onAuthTokenChange(event.target.value)}
        placeholder={
          spec.hasBearerAuth
            ? 'Bearer token (sent as Authorization header)'
            : 'Optional token value'
        }
        className="h-8 bg-background"
      />
      <p className="text-[11px] text-muted-foreground">
        {operation.supportsBearerAuth || spec.hasBearerAuth
          ? 'Bearer auth is documented for this API. Token will be attached automatically when not empty.'
          : 'This API does not explicitly document bearer auth. Your token is still stored locally.'}
      </p>
    </div>
  )
}
