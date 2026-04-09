import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ApiOperation } from '@/lib/openapi'
import type { Workspace } from '@/stores/api-console-store'
import { EndpointList } from './endpoint-list'
import { WorkspaceSwitcher } from './workspace-switcher'

export function Sidebar({
  activeSpecTitle,
  activeSpecUrl,
  currentWorkspaceId,
  groupedOperations,
  onOpenUrl,
  onOpenWorkspace,
  onRefreshSpec,
  onSaveWorkspace,
  onSelectOperation,
  search,
  selectedOperationKey,
  setSearch,
  workspaces,
}: {
  activeSpecTitle?: string
  activeSpecUrl: string
  currentWorkspaceId: string
  groupedOperations: Record<string, ApiOperation[]>
  onOpenUrl: (url: string) => void
  onOpenWorkspace: (workspaceId: string) => void
  onRefreshSpec: () => void
  onSaveWorkspace: (workspace: { name: string; url: string }) => void
  onSelectOperation: (operationKey: string) => void
  search: string
  selectedOperationKey: string
  setSearch: (value: string) => void
  workspaces: Workspace[]
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center border-b border-sidebar-border px-3 py-3">
        <button
          type="button"
          onClick={onRefreshSpec}
          className="text-base font-semibold uppercase tracking-[0.28em] text-sidebar-foreground hover:text-sidebar-foreground/80 cursor-pointer"
        >
          BDOC
        </button>
      </div>

      <div className="border-b border-sidebar-border px-3 py-3">
        <WorkspaceSwitcher
          activeSpecTitle={activeSpecTitle}
          activeSpecUrl={activeSpecUrl}
          currentWorkspaceId={currentWorkspaceId}
          onOpenUrl={onOpenUrl}
          onOpenWorkspace={onOpenWorkspace}
          onSaveWorkspace={onSaveWorkspace}
          workspaces={workspaces}
        />
      </div>

      <div className="border-b border-sidebar-border px-3 py-2">
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
            className="h-8 border-sidebar-border bg-sidebar-accent pl-8"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-1 py-2">
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
