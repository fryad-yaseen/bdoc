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
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select
          value={selectedServerUrl}
          onValueChange={(value) => {
            if (value) onServerChange(value)
          }}
        >
          <SelectTrigger className="w-48 shrink-0">
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
          className="flex-1 font-mono text-xs text-muted-foreground"
        />
      </div>
      {serverDescription ? (
        <p className="text-xs text-muted-foreground">{serverDescription}</p>
      ) : null}
    </div>
  )
}
