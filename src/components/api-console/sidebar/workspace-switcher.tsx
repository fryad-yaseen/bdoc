import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Workspace } from '@/stores/api-console-store'

const OPEN_URL_VALUE = '__open-url__'

function deriveWorkspaceName(url: string) {
  try {
    const parsedUrl = new URL(url)
    const segments = parsedUrl.pathname.split('/').filter(Boolean)
    return decodeURIComponent(segments.at(-1) || parsedUrl.hostname)
  } catch {
    return url
  }
}

export function WorkspaceSwitcher({
  activeSpecTitle,
  activeSpecUrl,
  currentWorkspaceId,
  onOpenUrl,
  onOpenWorkspace,
  onSaveWorkspace,
  workspaces,
}: {
  activeSpecTitle?: string
  activeSpecUrl: string
  currentWorkspaceId: string
  onOpenUrl: (url: string) => void
  onOpenWorkspace: (workspaceId: string) => void
  onSaveWorkspace: (workspace: { name: string; url: string }) => void
  workspaces: Workspace[]
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftUrl, setDraftUrl] = useState('')
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === currentWorkspaceId)

  useEffect(() => {
    if (!isDialogOpen) {
      return
    }

    const trimmedUrl = activeSpecUrl.trim()
    setDraftUrl(trimmedUrl)
    setDraftName((activeSpecTitle?.trim() && activeSpecTitle !== 'Untitled API')
      ? activeSpecTitle.trim()
      : deriveWorkspaceName(trimmedUrl))
  }, [activeSpecTitle, activeSpecUrl, isDialogOpen])

  const commitOpenUrl = () => {
    const nextUrl = draftUrl.trim()
    if (!nextUrl) {
      return
    }

    onOpenUrl(nextUrl)
    setIsDialogOpen(false)
  }

  const commitSaveWorkspace = () => {
    const nextUrl = draftUrl.trim()
    if (!nextUrl) {
      return
    }

    onSaveWorkspace({
      name: draftName.trim() || deriveWorkspaceName(nextUrl),
      url: nextUrl,
    })
    setIsDialogOpen(false)
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Workspace
          </label>
          <Button size="xs" variant="ghost" onClick={() => setIsDialogOpen(true)}>
            New
          </Button>
        </div>

        <Select
          value={currentWorkspaceId || undefined}
          onValueChange={(value) => {
            if (!value) {
              return
            }

            if (value === OPEN_URL_VALUE) {
              setIsDialogOpen(true)
              return
            }

            onOpenWorkspace(value)
          }}
        >
          <SelectTrigger className="h-8 w-full border-sidebar-border bg-sidebar-accent">
            <SelectValue placeholder="Open saved workspace">
              {selectedWorkspace?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            {workspaces.map((workspace) => (
              <SelectItem key={workspace.id} value={workspace.id}>
                {workspace.name}
              </SelectItem>
            ))}
            {workspaces.length > 0 ? <SelectSeparator /> : null}
            <SelectItem value={OPEN_URL_VALUE}>Open from URL…</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Open API workspace</DialogTitle>
            <DialogDescription>
              Paste an OpenAPI JSON URL, then either open it once or save it as a compact workspace entry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Workspace name
              </label>
              <Input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Petstore"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                OpenAPI JSON URL
              </label>
              <Input
                value={draftUrl}
                onChange={(event) => setDraftUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    commitSaveWorkspace()
                  }
                }}
                placeholder="https://example.com/openapi.json"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={commitOpenUrl}>
              Open once
            </Button>
            <Button onClick={commitSaveWorkspace}>
              Save workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
