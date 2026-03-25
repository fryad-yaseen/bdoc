import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ApiOperation } from '@/lib/openapi'
import { EndpointList } from './endpoint-list'
import { SpecLoader } from './spec-loader'

export function Sidebar({
  groupedOperations,
  onLoadSpec,
  onSelectOperation,
  recentSpecs,
  search,
  selectedOperationKey,
  setSearch,
  setSpecInput,
  specInput,
}: {
  groupedOperations: Record<string, ApiOperation[]>
  onLoadSpec: (url: string) => void
  onSelectOperation: (operationKey: string) => void
  recentSpecs: Array<{ title: string; url: string }>
  search: string
  selectedOperationKey: string
  setSearch: (value: string) => void
  setSpecInput: (value: string) => void
  specInput: string
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-4">
        <p className="text-xs font-medium text-muted-foreground">bdoc</p>
        <h1 className="mt-1 text-base font-semibold">API Console</h1>
      </div>

      <div className="border-b border-border px-4 py-4">
        <SpecLoader
          specInput={specInput}
          setSpecInput={setSpecInput}
          onLoadSpec={onLoadSpec}
          recentSpecs={recentSpecs}
        />
      </div>

      <div className="border-b border-border px-4 py-3">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter endpoints…"
            className="pl-8"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-2 py-3">
          <EndpointList
            groupedOperations={groupedOperations}
            selectedOperationKey={selectedOperationKey}
            onSelectOperation={onSelectOperation}
          />
        </div>
      </ScrollArea>
    </div>
  )
}
