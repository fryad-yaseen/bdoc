import { useDeferredValue, useEffect, useEffectEvent, useMemo, useRef, useState, useTransition } from 'react'
import { useHotkey } from '@tanstack/react-hotkeys'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  buildRequestUrl,
  createInitialDraft,
  type ApiOperation,
  getFetchTarget,
  type NormalizedSpec,
  loadOpenApiSpec,
} from '@/lib/openapi'
import { getDraftKey, useApiConsoleStore } from '@/stores/api-console-store'

import { OperationHeader } from './request/operation-header'
import { RequestBuilder } from './request/request-builder'
import { UrlBar } from './request/url-bar'
import { ResponsePanel } from './response/response-panel'
import { Sidebar } from './sidebar/sidebar'
import { WelcomeScreen } from './welcome-screen'

type RequestResult = {
  body: string
  durationMs: number
  headers: Array<[string, string]>
  ok: boolean
  status: number
  statusText: string
}

type RequestErrorState = {
  body?: string
  message: string
  status?: number
  statusText?: string
}

type RequestStateByOperation = Record<string, RequestResult | null>
type RequestErrorStateByOperation = Record<string, RequestErrorState | null>

function groupOperations(operations: ApiOperation[]) {
  return operations.reduce<Record<string, ApiOperation[]>>((groups, operation) => {
    if (!groups[operation.tag]) {
      groups[operation.tag] = []
    }
    groups[operation.tag].push(operation)
    return groups
  }, {})
}

export function ApiConsole() {
  const minRequestPanelHeight = 240
  const minResponsePanelHeight = 220
  const authToken = useApiConsoleStore((state) => state.authToken)
  const drafts = useApiConsoleStore((state) => state.drafts)
  const savedSpecUrl = useApiConsoleStore((state) => state.specUrl)
  const responseViewMode = useApiConsoleStore((state) => state.responseViewMode)
  const selectedOperationKey = useApiConsoleStore((state) => state.selectedOperationKey)
  const ensureDraft = useApiConsoleStore((state) => state.ensureDraft)
  const rememberSpec = useApiConsoleStore((state) => state.rememberSpec)
  const setAuthToken = useApiConsoleStore((state) => state.setAuthToken)
  const setBodyValue = useApiConsoleStore((state) => state.setBodyValue)
  const setDraftField = useApiConsoleStore((state) => state.setDraftField)
  const setResponseViewMode = useApiConsoleStore((state) => state.setResponseViewMode)
  const setSelectedContentType = useApiConsoleStore((state) => state.setSelectedContentType)
  const setSelectedOperationKey = useApiConsoleStore((state) => state.setSelectedOperationKey)
  const setSelectedServerUrl = useApiConsoleStore((state) => state.setSelectedServerUrl)
  const setSpecUrl = useApiConsoleStore((state) => state.setSpecUrl)

  const [specInput, setSpecInput] = useState(savedSpecUrl)
  const [spec, setSpec] = useState<NormalizedSpec | null>(null)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [requestErrorsByOperation, setRequestErrorsByOperation] = useState<RequestErrorStateByOperation>({})
  const [requestResultsByOperation, setRequestResultsByOperation] = useState<RequestStateByOperation>({})
  const [executingRequestKey, setExecutingRequestKey] = useState('')
  const [activeResponseTab, setActiveResponseTab] = useState<'response' | 'expected'>('response')
  const [responsePanelHeight, setResponsePanelHeight] = useState(320)
  const [isPending, startTransition] = useTransition()
  const deferredSearch = useDeferredValue(search)
  const contentSplitRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<{ startY: number; startHeight: number } | null>(null)

  useEffect(() => {
    if (!savedSpecUrl) return
    startTransition(async () => {
      try {
        const nextSpec = await loadOpenApiSpec(savedSpecUrl)
        setSpec(nextSpec)
        setLoadError('')
        rememberSpec({ title: nextSpec.title, url: savedSpecUrl })
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Failed to load the OpenAPI document.')
      }
    })
  }, [rememberSpec, savedSpecUrl])

  const filteredOperations = useMemo(() => {
    if (!spec) return []
    const normalizedSearch = deferredSearch.trim().toLowerCase()
    if (!normalizedSearch) return spec.operations
    return spec.operations.filter((operation) => {
      const haystack = [operation.method, operation.path, operation.summary, operation.description, operation.tag]
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalizedSearch)
    })
  }, [deferredSearch, spec])

  const groupedOperations = useMemo(() => groupOperations(filteredOperations), [filteredOperations])

  const selectedOperation =
    filteredOperations.find((op) => op.key === selectedOperationKey) ??
    spec?.operations.find((op) => op.key === selectedOperationKey) ??
    filteredOperations[0] ??
    spec?.operations[0] ??
    null

  useEffect(() => {
    if (!selectedOperation) return
    if (selectedOperation.key !== selectedOperationKey) {
      setSelectedOperationKey(selectedOperation.key)
    }
  }, [selectedOperation, selectedOperationKey, setSelectedOperationKey])

  const draftKey = spec && selectedOperation ? getDraftKey(spec.sourceUrl, selectedOperation.key) : ''
  const activeDraft = draftKey ? drafts[draftKey] : undefined
  const requestResult = draftKey ? requestResultsByOperation[draftKey] ?? null : null
  const requestError = draftKey ? requestErrorsByOperation[draftKey] ?? null : null
  const isExecutingRequest = draftKey.length > 0 && executingRequestKey === draftKey

  useEffect(() => {
    if (!spec || !selectedOperation) return
    ensureDraft(draftKey, {
      ...createInitialDraft(selectedOperation),
      selectedServerUrl: spec.servers[0]?.resolvedUrl ?? window.location.origin,
    })
  }, [draftKey, ensureDraft, selectedOperation, spec])

  const loadSpec = (url: string) => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      setLoadError('Enter an OpenAPI JSON URL first.')
      return
    }
    setSpecUrl(trimmedUrl)
    startTransition(async () => {
      try {
        const nextSpec = await loadOpenApiSpec(trimmedUrl)
        setSpec(nextSpec)
        setLoadError('')
        setRequestErrorsByOperation({})
        setRequestResultsByOperation({})
        setExecutingRequestKey('')
        rememberSpec({ title: nextSpec.title, url: trimmedUrl })
        setSelectedOperationKey(nextSpec.operations[0]?.key ?? '')
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Failed to load the OpenAPI document.')
      }
    })
  }

  const executeRequest = async () => {
    if (!spec || !selectedOperation || !activeDraft || isExecutingRequest) return
    setRequestErrorsByOperation((current) => ({
      ...current,
      [draftKey]: null,
    }))
    setRequestResultsByOperation((current) => ({
      ...current,
      [draftKey]: null,
    }))
    setActiveResponseTab('response')
    setExecutingRequestKey(draftKey)

    try {
      const url = buildRequestUrl(
        activeDraft.selectedServerUrl,
        selectedOperation.path,
        activeDraft.pathParams,
        activeDraft.queryParams,
      )

      const headers = new Headers()
      for (const [name, value] of Object.entries(activeDraft.headerParams)) {
        if (value.trim()) headers.set(name, value)
      }

      if (authToken.trim() && (selectedOperation.supportsBearerAuth || spec.hasBearerAuth)) {
        headers.set('Authorization', `Bearer ${authToken.trim()}`)
      }

      const selectedContentType = activeDraft.selectedContentType
      const selectedBody =
        selectedContentType.length > 0 ? activeDraft.bodyByContentType[selectedContentType] ?? '' : ''

      if (selectedContentType && selectedBody.trim()) {
        headers.set('Content-Type', selectedContentType)
      }

      const startedAt = performance.now()
      const response = await fetch(getFetchTarget(url), {
        method: selectedOperation.method.toUpperCase(),
        headers,
        body: selectedBody.trim() ? selectedBody : undefined,
      })
      const durationMs = performance.now() - startedAt
      const body = await response.text()

      setRequestResultsByOperation((current) => ({
        ...current,
        [draftKey]: {
          body,
          durationMs,
          headers: [...response.headers.entries()],
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
        },
      }))

      if (!response.ok) {
        setRequestErrorsByOperation((current) => ({
          ...current,
          [draftKey]: {
            body,
            message: `Request failed with ${response.status} ${response.statusText}`.trim(),
            status: response.status,
            statusText: response.statusText,
          },
        }))
      }
    } catch (error) {
      setRequestErrorsByOperation((current) => ({
        ...current,
        [draftKey]: {
          message:
            error instanceof Error
              ? error.message
              : 'The request failed before a response was returned.',
        },
      }))
    } finally {
      setExecutingRequestKey((current) => (current === draftKey ? '' : current))
    }
  }

  useHotkey(
    'Control+Enter',
    () => {
      void executeRequest()
    },
    {
      enabled: Boolean(spec && selectedOperation && activeDraft),
    },
  )

  useHotkey(
    'Mod+Z',
    () => {
      const activeElement = document.activeElement
      const isEditable =
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLElement

      if (!isEditable) {
        return
      }

      document.execCommand('undo')
    },
    {
      enabled: true,
    },
  )

  const sidebarContent = (
    <Sidebar
      groupedOperations={groupedOperations}
      onLoadSpec={loadSpec}
      onSelectOperation={setSelectedOperationKey}
      search={search}
      selectedOperationKey={selectedOperationKey}
      setSearch={setSearch}
      setSpecInput={setSpecInput}
      specInput={specInput}
    />
  )

  const stopResponseResize = useEffectEvent(() => {
    dragStateRef.current = null
    document.body.style.removeProperty('cursor')
    document.body.style.removeProperty('user-select')
  })

  const updateResponseHeight = useEffectEvent((nextHeight: number) => {
    const splitRect = contentSplitRef.current?.getBoundingClientRect()
    if (!splitRect) return

    const maxResponseHeight = Math.max(
      minResponsePanelHeight,
      splitRect.height - minRequestPanelHeight - 28 - 8,
    )

    setResponsePanelHeight(Math.min(Math.max(nextHeight, minResponsePanelHeight), maxResponseHeight))
  })

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragStateRef.current) return
      updateResponseHeight(dragStateRef.current.startHeight - (event.clientY - dragStateRef.current.startY))
    }

    const handlePointerUp = () => {
      stopResponseResize()
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [stopResponseResize, updateResponseHeight])

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <div className="grid h-full overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="hidden h-full overflow-hidden border-r border-sidebar-border lg:block">
          {sidebarContent}
        </aside>

        {/* Main content */}
        <main className="flex h-full min-w-0 flex-col overflow-hidden">
          {/* Mobile sidebar trigger */}
          <div className="border-b border-border px-4 py-2 lg:hidden">
            <Sheet>
              <SheetTrigger render={<Button variant="outline" size="sm" />} type="button">
                Browse
              </SheetTrigger>
              <SheetContent side="left" className="w-[22rem] p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>API Navigation</SheetTitle>
                </SheetHeader>
                {sidebarContent}
              </SheetContent>
            </Sheet>
          </div>

          {/* Load error banner */}
          {loadError ? (
            <div className="border-b border-destructive/30 bg-destructive/10 px-6 py-3 text-sm text-destructive">
              {loadError}
            </div>
          ) : null}

          {/* Content area */}
          {!spec ? (
            <div className="min-h-0 flex-1 overflow-hidden">
              <WelcomeScreen isLoading={isPending} />
            </div>
          ) : selectedOperation && activeDraft ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <OperationHeader
                operation={selectedOperation}
                canSend={!!activeDraft}
                isSending={isExecutingRequest}
                onSend={executeRequest}
              />

              <UrlBar
                servers={spec.servers}
                selectedServerUrl={activeDraft.selectedServerUrl}
                onServerChange={(url) => setSelectedServerUrl(draftKey, url)}
                path={selectedOperation.path}
                pathParams={activeDraft.pathParams}
                queryParams={activeDraft.queryParams}
              />

              <div
                ref={contentSplitRef}
                className="grid min-h-0 flex-1"
                style={{ gridTemplateRows: `minmax(0,1fr) 8px ${responsePanelHeight}px 28px` }}
              >
                <ScrollArea className="min-h-0">
                  <RequestBuilder
                    operation={selectedOperation}
                    spec={spec}
                    draft={activeDraft}
                    authToken={authToken}
                    draftKey={draftKey}
                    onAuthTokenChange={setAuthToken}
                    onDraftField={setDraftField}
                    onBodyChange={setBodyValue}
                    onContentTypeChange={setSelectedContentType}
                  />
                </ScrollArea>

                <div
                  role="separator"
                  aria-label="Resize response panel"
                  aria-orientation="horizontal"
                  className="group flex cursor-row-resize items-center justify-center bg-background"
                  onPointerDown={(event) => {
                    dragStateRef.current = {
                      startY: event.clientY,
                      startHeight: responsePanelHeight,
                    }
                    document.body.style.cursor = 'row-resize'
                    document.body.style.userSelect = 'none'
                  }}
                >
                  <div className="h-px w-full bg-border transition-colors group-hover:bg-primary/60" />
                </div>

                <ResponsePanel
                  operation={selectedOperation}
                  result={requestResult}
                  error={requestError}
                  isLoading={isExecutingRequest}
                  activeTab={activeResponseTab}
                  onTabChange={setActiveResponseTab}
                  responseViewMode={responseViewMode}
                  onResponseViewModeChange={setResponseViewMode}
                />
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
              <p className="text-sm text-muted-foreground">
                No endpoints match the current filter.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
