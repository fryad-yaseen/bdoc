import { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  buildRequestUrl,
  createInitialDraft,
  type ApiOperation,
  type NormalizedSpec,
  type ParameterDefinition,
  type ParameterLocation,
  type ResponseDefinition,
  loadOpenApiSpec,
} from '@/lib/openapi'
import { cn } from '@/lib/utils'
import { getDraftKey, useApiConsoleStore } from '@/stores/api-console-store'

type RequestResult = {
  body: string
  durationMs: number
  headers: Array<[string, string]>
  ok: boolean
  status: number
  statusText: string
}

function formatJson(input: string): string {
  if (!input.trim()) {
    return ''
  }

  try {
    return JSON.stringify(JSON.parse(input), null, 2)
  } catch {
    return input
  }
}

function methodTone(method: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (method === 'get') return 'secondary'
  if (method === 'delete') return 'destructive'
  if (method === 'post' || method === 'put' || method === 'patch') return 'default'
  return 'outline'
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

function ParameterTable({
  location,
  operation,
  values,
  onChange,
}: {
  location: ParameterLocation
  operation: ApiOperation
  values: Record<string, string>
  onChange: (name: string, value: string) => void
}) {
  const parameters = operation.parameters.filter((parameter) => parameter.in === location)
  if (parameters.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No {location} parameters for this operation.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Required</TableHead>
          <TableHead className="w-full">Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {parameters.map((parameter) => (
          <TableRow key={`${location}:${parameter.name}`}>
            <TableCell className="align-top font-medium">{parameter.name}</TableCell>
            <TableCell className="align-top text-muted-foreground">{parameter.typeLabel}</TableCell>
            <TableCell className="align-top">
              {parameter.required ? <Badge variant="outline">Required</Badge> : 'Optional'}
            </TableCell>
            <TableCell className="w-full min-w-56">
              <div className="space-y-2">
                <Input
                  value={values[parameter.name] ?? ''}
                  onChange={(event) => onChange(parameter.name, event.target.value)}
                  placeholder={parameter.exampleValue || parameter.defaultValue || `Set ${parameter.name}`}
                />
                {parameter.description ? (
                  <p className="text-xs text-muted-foreground">{parameter.description}</p>
                ) : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ResponseReference({ response }: { response: ResponseDefinition }) {
  return (
    <AccordionItem value={response.statusCode}>
      <AccordionTrigger>
        <div className="flex items-center gap-3">
          <Badge variant={response.statusCode.startsWith('2') ? 'secondary' : 'outline'}>
            {response.statusCode}
          </Badge>
          <div className="space-y-1">
            <p>{response.description || 'Response'}</p>
            <p className="text-xs font-normal text-muted-foreground">
              {response.contents.length > 0
                ? response.contents.map((content) => content.contentType).join(' • ')
                : 'No media types described'}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-4">
        {response.contents.length === 0 ? (
          <p className="text-xs text-muted-foreground">This response does not define a response body.</p>
        ) : (
          response.contents.map((content) => (
            <div key={`${response.statusCode}-${content.contentType}`} className="space-y-2 border-l border-border pl-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{content.contentType}</Badge>
                <span className="text-xs text-muted-foreground">{content.schemaLabel}</span>
              </div>
              {content.example ? (
                <pre className="overflow-x-auto border border-border bg-muted/30 p-3 text-[11px] leading-5">
                  {formatJson(content.example)}
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground">No example body provided.</p>
              )}
            </div>
          ))
        )}
      </AccordionContent>
    </AccordionItem>
  )
}

function renderSidebar({
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
        <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">bdoc</p>
        <h1 className="mt-2 font-heading text-lg">API Console</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Swagger reference in the middle, Postman-style editing on the side.
        </p>
      </div>

      <div className="space-y-3 border-b border-border px-4 py-4">
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            OpenAPI JSON URL
          </label>
          <Input
            value={specInput}
            onChange={(event) => setSpecInput(event.target.value)}
            placeholder="https://example.com/openapi.json"
          />
        </div>
        <Button className="w-full" onClick={() => onLoadSpec(specInput)}>
          Load Spec
        </Button>
      </div>

      {recentSpecs.length > 0 ? (
        <div className="space-y-3 border-b border-border px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Recent</p>
          <div className="space-y-2">
            {recentSpecs.map((recent) => (
              <button
                key={recent.url}
                className="w-full border border-border px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50"
                onClick={() => {
                  setSpecInput(recent.url)
                  onLoadSpec(recent.url)
                }}
                type="button"
              >
                <div className="font-medium">{recent.title}</div>
                <div className="mt-1 truncate text-muted-foreground">{recent.url}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="border-b border-border px-4 py-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter endpoints"
        />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-2 py-3">
          <Accordion>
            {Object.entries(groupedOperations).map(([tag, operations]) => (
              <AccordionItem key={tag} value={tag} className="border-b-0">
                <AccordionTrigger className="px-2">
                  <div className="space-y-1">
                    <p>{tag}</p>
                    <p className="text-[11px] font-normal text-muted-foreground">
                      {operations.length} endpoint{operations.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pb-3">
                  {operations.map((operation) => {
                    const selected = operation.key === selectedOperationKey
                    return (
                      <button
                        key={operation.key}
                        className={cn(
                          'w-full border border-transparent px-2 py-2 text-left transition-colors hover:border-border hover:bg-muted/30',
                          selected && 'border-border bg-muted/50',
                        )}
                        onClick={() => onSelectOperation(operation.key)}
                        type="button"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant={methodTone(operation.method)}>
                            {operation.method.toUpperCase()}
                          </Badge>
                          <span className="truncate text-xs">{operation.path}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {operation.summary}
                        </p>
                      </button>
                    )
                  })}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  )
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
    if (!savedSpecUrl) {
      return
    }

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
    if (!spec) {
      return []
    }

    const normalizedSearch = deferredSearch.trim().toLowerCase()
    if (!normalizedSearch) {
      return spec.operations
    }

    return spec.operations.filter((operation) => {
      const haystack = [
        operation.method,
        operation.path,
        operation.summary,
        operation.description,
        operation.tag,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [deferredSearch, spec])

  const groupedOperations = useMemo(() => groupOperations(filteredOperations), [filteredOperations])

  const selectedOperation =
    filteredOperations.find((operation) => operation.key === selectedOperationKey) ??
    spec?.operations.find((operation) => operation.key === selectedOperationKey) ??
    filteredOperations[0] ??
    spec?.operations[0] ??
    null

  useEffect(() => {
    if (!selectedOperation) {
      return
    }

    if (selectedOperation.key !== selectedOperationKey) {
      setSelectedOperationKey(selectedOperation.key)
    }
  }, [selectedOperation, selectedOperationKey, setSelectedOperationKey])

  const draftKey = spec && selectedOperation ? getDraftKey(spec.sourceUrl, selectedOperation.key) : ''
  const activeDraft = draftKey ? drafts[draftKey] : undefined

  useEffect(() => {
    if (!spec || !selectedOperation) {
      return
    }

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
    if (!spec || !selectedOperation || !activeDraft) {
      return
    }

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
        if (value.trim()) {
          headers.set(name, value)
        }
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
        error instanceof Error
          ? error.message
          : 'The request failed before a response was returned.',
      )
    }
  }

  const sidebar = renderSidebar({
    groupedOperations,
    onLoadSpec: loadSpec,
    onSelectOperation: setSelectedOperationKey,
    recentSpecs,
    search,
    selectedOperationKey,
    setSearch,
    setSpecInput,
    specInput,
  })

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-muted/20 lg:block">{sidebar}</aside>

        <main className="flex min-h-screen min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3 px-4 py-4 md:px-6">
              <div className="lg:hidden">
                <Sheet>
                  <SheetTrigger render={<Button variant="outline" size="sm" />} type="button">
                    Browse
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[22rem] p-0">
                    <SheetHeader className="sr-only">
                      <SheetTitle>API Navigation</SheetTitle>
                    </SheetHeader>
                    {sidebar}
                  </SheetContent>
                </Sheet>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-heading text-lg">{spec?.title ?? 'Load an OpenAPI document'}</p>
                  {spec?.version ? <Badge variant="outline">v{spec.version}</Badge> : null}
                  {selectedOperation ? (
                    <Badge variant={methodTone(selectedOperation.method)}>
                      {selectedOperation.method.toUpperCase()}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {selectedOperation
                    ? `${selectedOperation.path} • ${selectedOperation.summary}`
                    : 'Paste a JSON URL on the left and load the spec.'}
                </p>
              </div>

              <div className="w-full min-w-64 max-w-sm space-y-2">
                <label className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                  Bearer Token
                </label>
                <Input
                  value={authToken}
                  onChange={(event) => setAuthToken(event.target.value)}
                  placeholder="JWT token"
                />
              </div>
            </div>
          </header>

          {loadError ? (
            <div className="border-b border-destructive/30 bg-destructive/10 px-6 py-3 text-xs text-destructive">
              {loadError}
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_28rem]">
            <section className="min-h-0 border-b border-border xl:border-b-0 xl:border-r">
              <ScrollArea className="h-[calc(100vh-81px)]">
                <div className="space-y-8 px-4 py-6 md:px-6">
                  {isPending && !spec ? (
                    <p className="text-xs text-muted-foreground">Loading specification…</p>
                  ) : null}

                  {!spec ? (
                    <div className="max-w-2xl space-y-6">
                      <div className="space-y-3">
                        <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
                          OpenAPI Workspace
                        </p>
                        <h2 className="font-heading text-4xl leading-none">
                          Always-editable API docs and requests in one surface.
                        </h2>
                      </div>
                      <p className="max-w-xl text-sm text-muted-foreground">
                        Load a remote OpenAPI JSON document, inspect routes and response shapes,
                        edit every request immediately, and keep your auth token plus draft
                        parameters in local storage.
                      </p>
                      <div className="grid gap-4 border-y border-border py-6 sm:grid-cols-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                            Sidebar
                          </p>
                          <p className="mt-2 text-sm">Tag groups, route search, recent specs.</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                            Reference
                          </p>
                          <p className="mt-2 text-sm">Parameters, body examples, documented responses.</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                            Requests
                          </p>
                          <p className="mt-2 text-sm">Immediate editing and direct browser execution.</p>
                        </div>
                      </div>
                    </div>
                  ) : selectedOperation ? (
                    <>
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge variant={methodTone(selectedOperation.method)}>
                            {selectedOperation.method.toUpperCase()}
                          </Badge>
                          <code className="text-sm">{selectedOperation.path}</code>
                        </div>
                        <div className="space-y-2">
                          <h2 className="font-heading text-3xl leading-none">{selectedOperation.summary}</h2>
                          {selectedOperation.description ? (
                            <p className="max-w-3xl text-sm text-muted-foreground">
                              {selectedOperation.description}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <Separator />

                      <section className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                            Parameters
                          </p>
                          <h3 className="font-heading text-lg">Input reference</h3>
                        </div>
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <p className="text-xs font-medium">Path parameters</p>
                            <ParameterReference
                              parameters={selectedOperation.parameters.filter((parameter) => parameter.in === 'path')}
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-medium">Query parameters</p>
                            <ParameterReference
                              parameters={selectedOperation.parameters.filter((parameter) => parameter.in === 'query')}
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-medium">Header parameters</p>
                            <ParameterReference
                              parameters={selectedOperation.parameters.filter((parameter) => parameter.in === 'header')}
                            />
                          </div>
                        </div>
                      </section>

                      <Separator />

                      <section className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                            Request Body
                          </p>
                          <h3 className="font-heading text-lg">Documented payloads</h3>
                        </div>
                        {selectedOperation.requestBodyContents.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            This operation does not define a request body.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {selectedOperation.requestBodyContents.map((content) => (
                              <div key={content.contentType} className="space-y-2 border-l border-border pl-4">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{content.contentType}</Badge>
                                  <span className="text-xs text-muted-foreground">{content.schemaLabel}</span>
                                </div>
                                {content.example ? (
                                  <pre className="overflow-x-auto border border-border bg-muted/30 p-3 text-[11px] leading-5">
                                    {formatJson(content.example)}
                                  </pre>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    No example body was published for this media type.
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </section>

                      <Separator />

                      <section className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                            Responses
                          </p>
                          <h3 className="font-heading text-lg">Possible responses</h3>
                        </div>
                        {selectedOperation.responses.length === 0 ? (
                          <p className="text-xs text-muted-foreground">This operation does not describe any responses.</p>
                        ) : (
                          <Accordion>
                            {selectedOperation.responses.map((response) => (
                              <ResponseReference key={response.statusCode} response={response} />
                            ))}
                          </Accordion>
                        )}
                      </section>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No endpoints match the current filter.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </section>

            <aside className="min-h-0">
              <ScrollArea className="h-[calc(100vh-81px)]">
                <div className="space-y-5 px-4 py-6 md:px-6">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                      Request Console
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        disabled={!selectedOperation || !activeDraft}
                        onClick={executeRequest}
                      >
                        Send Request
                      </Button>
                      {requestResult ? (
                        <Badge variant={requestResult.ok ? 'secondary' : 'destructive'}>
                          {requestResult.status} {requestResult.statusText}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Requests are sent directly from the browser, so target APIs still need CORS to allow them.
                    </p>
                  </div>

                  {selectedOperation && activeDraft ? (
                    <Tabs defaultValue="request">
                      <TabsList variant="line">
                        <TabsTrigger value="request">Request</TabsTrigger>
                        <TabsTrigger value="response">Response</TabsTrigger>
                      </TabsList>

                      <TabsContent value="request" className="space-y-6 pt-4">
                        <section className="space-y-3">
                          <p className="text-xs font-medium">Server</p>
                          <Select
                            value={activeDraft.selectedServerUrl}
                            onValueChange={(value) => {
                              if (value) {
                                setSelectedServerUrl(draftKey, value)
                              }
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a server" />
                            </SelectTrigger>
                            <SelectContent>
                              {spec?.servers.map((server) => (
                                <SelectItem key={server.resolvedUrl} value={server.resolvedUrl}>
                                  {server.url}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {spec?.servers.find((server) => server.resolvedUrl === activeDraft.selectedServerUrl)
                            ?.description ? (
                            <p className="text-xs text-muted-foreground">
                              {
                                spec.servers.find(
                                  (server) => server.resolvedUrl === activeDraft.selectedServerUrl,
                                )?.description
                              }
                            </p>
                          ) : null}
                        </section>

                        <Separator />

                        <section className="space-y-3">
                          <p className="text-xs font-medium">Auth</p>
                          <div className="space-y-2">
                            <Input
                              value={authToken}
                              onChange={(event) => setAuthToken(event.target.value)}
                              placeholder={
                                spec?.hasBearerAuth
                                  ? 'JWT token sent as Authorization: Bearer <token>'
                                  : 'Optional token value'
                              }
                            />
                            <p className="text-xs text-muted-foreground">
                              {selectedOperation.supportsBearerAuth || spec?.hasBearerAuth
                                ? 'Bearer auth is documented for this API and will be attached automatically when the token field is not empty.'
                                : 'This API does not explicitly document bearer auth, but your token is still stored locally for reuse.'}
                            </p>
                          </div>
                        </section>

                        <Separator />

                        <section className="space-y-3">
                          <p className="text-xs font-medium">Path parameters</p>
                          <ParameterTable
                            location="path"
                            operation={selectedOperation}
                            values={activeDraft.pathParams}
                            onChange={(name, value) => setDraftField(draftKey, 'pathParams', name, value)}
                          />
                        </section>

                        <section className="space-y-3">
                          <p className="text-xs font-medium">Query parameters</p>
                          <ParameterTable
                            location="query"
                            operation={selectedOperation}
                            values={activeDraft.queryParams}
                            onChange={(name, value) => setDraftField(draftKey, 'queryParams', name, value)}
                          />
                        </section>

                        <section className="space-y-3">
                          <p className="text-xs font-medium">Header parameters</p>
                          <ParameterTable
                            location="header"
                            operation={selectedOperation}
                            values={activeDraft.headerParams}
                            onChange={(name, value) => setDraftField(draftKey, 'headerParams', name, value)}
                          />
                        </section>

                        <section className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-medium">Body</p>
                            {selectedOperation.requestBodyContents.length > 0 ? (
                              <Select
                                value={activeDraft.selectedContentType}
                                onValueChange={(value) => {
                                  if (value) {
                                    setSelectedContentType(draftKey, value)
                                  }
                                }}
                              >
                                <SelectTrigger size="sm">
                                  <SelectValue placeholder="Content type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectedOperation.requestBodyContents.map((content) => (
                                    <SelectItem key={content.contentType} value={content.contentType}>
                                      {content.contentType}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : null}
                          </div>
                          {selectedOperation.requestBodyContents.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No request body for this operation.</p>
                          ) : (
                            <Textarea
                              className="min-h-72 font-mono text-[11px]"
                              value={
                                activeDraft.bodyByContentType[activeDraft.selectedContentType] ?? ''
                              }
                              onChange={(event) =>
                                setBodyValue(
                                  draftKey,
                                  activeDraft.selectedContentType,
                                  event.target.value,
                                )
                              }
                            />
                          )}
                        </section>
                      </TabsContent>

                      <TabsContent value="response" className="space-y-4 pt-4">
                        {requestError ? (
                          <div className="border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                            {requestError}
                          </div>
                        ) : null}

                        {!requestResult ? (
                          <p className="text-xs text-muted-foreground">
                            Send a request to inspect the live response here.
                          </p>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={requestResult.ok ? 'secondary' : 'destructive'}>
                                {requestResult.status} {requestResult.statusText}
                              </Badge>
                              <Badge variant="outline">
                                {Math.round(requestResult.durationMs)} ms
                              </Badge>
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs font-medium">Headers</p>
                              <div className="border border-border">
                                <Table>
                                  <TableBody>
                                    {requestResult.headers.map(([name, value]) => (
                                      <TableRow key={name}>
                                        <TableCell className="font-medium">{name}</TableCell>
                                        <TableCell className="whitespace-normal break-all text-muted-foreground">
                                          {value}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs font-medium">Body</p>
                              <pre className="overflow-x-auto border border-border bg-muted/30 p-3 text-[11px] leading-5">
                                {formatJson(requestResult.body) || 'Empty response body'}
                              </pre>
                            </div>
                          </>
                        )}
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Select an endpoint to edit and send a request.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </aside>
          </div>
        </main>
      </div>
    </div>
  )
}

function ParameterReference({ parameters }: { parameters: ParameterDefinition[] }) {
  if (parameters.length === 0) {
    return <p className="text-xs text-muted-foreground">None documented.</p>
  }

  return (
    <div className="border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Required</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parameters.map((parameter) => (
            <TableRow key={`${parameter.in}:${parameter.name}`}>
              <TableCell className="font-medium">{parameter.name}</TableCell>
              <TableCell className="text-muted-foreground">{parameter.typeLabel}</TableCell>
              <TableCell>{parameter.required ? 'Yes' : 'No'}</TableCell>
              <TableCell className="whitespace-normal text-muted-foreground">
                {parameter.description || 'No description'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
