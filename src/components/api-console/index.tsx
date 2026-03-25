import { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  buildRequestUrl,
  createInitialDraft,
  type ApiOperation,
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
  const authToken = useApiConsoleStore((state) => state.authToken)
  const drafts = useApiConsoleStore((state) => state.drafts)
  const recentSpecs = useApiConsoleStore((state) => state.recentSpecs)
  const savedSpecUrl = useApiConsoleStore((state) => state.specUrl)
  const selectedOperationKey = useApiConsoleStore((state) => state.selectedOperationKey)
  const ensureDraft = useApiConsoleStore((state) => state.ensureDraft)
  const rememberSpec = useApiConsoleStore((state) => state.rememberSpec)
  const setAuthToken = useApiConsoleStore((state) => state.setAuthToken)
  const setBodyValue = useApiConsoleStore((state) => state.setBodyValue)
  const setDraftField = useApiConsoleStore((state) => state.setDraftField)
  const setSelectedContentType = useApiConsoleStore((state) => state.setSelectedContentType)
  const setSelectedOperationKey = useApiConsoleStore((state) => state.setSelectedOperationKey)
  const setSelectedServerUrl = useApiConsoleStore((state) => state.setSelectedServerUrl)
  const setSpecUrl = useApiConsoleStore((state) => state.setSpecUrl)

  const [specInput, setSpecInput] = useState(savedSpecUrl)
  const [spec, setSpec] = useState<NormalizedSpec | null>(null)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [requestError, setRequestError] = useState('')
  const [requestResult, setRequestResult] = useState<RequestResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const deferredSearch = useDeferredValue(search)

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
        setRequestError('')
        setRequestResult(null)
        rememberSpec({ title: nextSpec.title, url: trimmedUrl })
        setSelectedOperationKey(nextSpec.operations[0]?.key ?? '')
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Failed to load the OpenAPI document.')
      }
    })
  }

  const executeRequest = async () => {
    if (!spec || !selectedOperation || !activeDraft) return
    setRequestError('')
    setRequestResult(null)

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
      const response = await fetch(url, {
        method: selectedOperation.method.toUpperCase(),
        headers,
        body: selectedBody.trim() ? selectedBody : undefined,
      })
      const durationMs = performance.now() - startedAt
      const body = await response.text()

      setRequestResult({
        body,
        durationMs,
        headers: [...response.headers.entries()],
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      })
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : 'The request failed before a response was returned.',
      )
    }
  }

  const sidebarContent = (
    <Sidebar
      groupedOperations={groupedOperations}
      onLoadSpec={loadSpec}
      onSelectOperation={setSelectedOperationKey}
      recentSpecs={recentSpecs}
      search={search}
      selectedOperationKey={selectedOperationKey}
      setSearch={setSearch}
      setSpecInput={setSpecInput}
      specInput={specInput}
    />
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="hidden border-r border-border bg-muted/20 lg:block">
          {sidebarContent}
        </aside>

        {/* Main content */}
        <main className="flex min-h-screen min-w-0 flex-col">
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
            <WelcomeScreen isLoading={isPending} />
          ) : selectedOperation && activeDraft ? (
            <ScrollArea className="h-[calc(100vh-1px)] lg:h-screen">
              <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-8">
                {/* Operation header with Send button */}
                <OperationHeader
                  operation={selectedOperation}
                  canSend={!!activeDraft}
                  onSend={executeRequest}
                />

                <Separator />

                {/* URL bar */}
                <UrlBar
                  servers={spec.servers}
                  selectedServerUrl={activeDraft.selectedServerUrl}
                  onServerChange={(url) => setSelectedServerUrl(draftKey, url)}
                  path={selectedOperation.path}
                  pathParams={activeDraft.pathParams}
                  queryParams={activeDraft.queryParams}
                />

                <Separator />

                {/* Request builder with tabs */}
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

                {/* Response panel — always visible below */}
                <ResponsePanel result={requestResult} error={requestError} />

                {/* CORS note */}
                <p className="pb-4 text-xs text-muted-foreground">
                  Requests are sent directly from the browser. Target APIs need CORS to allow them.
                </p>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-full items-center justify-center">
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
