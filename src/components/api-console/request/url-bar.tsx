import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ServerDefinition } from '@/lib/openapi'
import { buildRequestUrl } from '@/lib/openapi'

export function UrlBar({
  servers,
  selectedServerUrl,
  onServerChange,
  path,
  pathParams,
  queryParams,
}: {
  servers: ServerDefinition[]
  selectedServerUrl: string
  onServerChange: (url: string) => void
  path: string
  pathParams: Record<string, string>
  queryParams: Record<string, string>
}) {
  const resolvedUrl = buildRequestUrl(selectedServerUrl, path, pathParams, queryParams)
  const serverDescription = servers.find((s) => s.resolvedUrl === selectedServerUrl)?.description

  return (
    <div className="space-y-2 border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <Select
          value={selectedServerUrl}
          onValueChange={(value) => {
            if (value) onServerChange(value)
          }}
        >
          <SelectTrigger className="h-9 w-52 shrink-0 bg-card">
            <SelectValue placeholder="Server" />
          </SelectTrigger>
          <SelectContent>
            {servers.map((server) => (
              <SelectItem key={server.resolvedUrl} value={server.resolvedUrl}>
                {server.url}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={resolvedUrl}
          readOnly
          className="h-9 flex-1 bg-card font-mono text-xs text-foreground"
        />
      </div>
      {serverDescription ? (
        <p className="text-[11px] text-muted-foreground">{serverDescription}</p>
      ) : null}
    </div>
  )
}
