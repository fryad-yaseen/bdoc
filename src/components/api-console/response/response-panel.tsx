import { useEffect, useState } from 'react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy01Icon, CopyCheckIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ApiOperation } from '@/lib/openapi'
import { JsonTreeViewer, type JsonValue } from './json-tree-viewer'
import { formatResponseBody, parseJsonSafely, type ResponseViewMode } from '../shared/format-json'

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

type RequestSnapshot = {
  body: string
  headers: Array<[string, string]>
  method: string
  url: string
}

function formatRawRequest(snapshot: RequestSnapshot) {
  const requestLine = `${snapshot.method} ${snapshot.url}`
  const headers = snapshot.headers.map(([name, value]) => `${name}: ${value}`).join('\n')

  if (!headers && !snapshot.body) {
    return requestLine
  }

  if (!snapshot.body) {
    return `${requestLine}\n${headers}`
  }

  if (!headers) {
    return `${requestLine}\n\n${snapshot.body}`
  }

  return `${requestLine}\n${headers}\n\n${snapshot.body}`
}

function formatRawResponse(result: RequestResult) {
  const statusLine = `HTTP ${result.status} ${result.statusText}`.trim()
  const headers = result.headers.map(([name, value]) => `${name}: ${value}`).join('\n')

  if (!headers && !result.body) {
    return statusLine
  }

  if (!result.body) {
    return `${statusLine}\n${headers}`
  }

  if (!headers) {
    return `${statusLine}\n\n${result.body}`
  }

  return `${statusLine}\n${headers}\n\n${result.body}`
}

function CopyTextButton({
  text,
  label,
}: {
  text: string
  label: string
}) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (status === 'idle') {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setStatus('idle')
    }, 1600)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [status])

  const handleClick = async () => {
    if (!text) return

    try {
      await navigator.clipboard.writeText(text)
      setStatus('copied')
    } catch {
      setStatus('failed')
    }
  }

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={() => void handleClick()}
      disabled={!text}
      aria-label={status === 'copied' ? `${label} copied` : status === 'failed' ? `${label} failed` : label}
      title={status === 'copied' ? `${label} copied` : status === 'failed' ? `${label} failed` : label}
    >
      <HugeiconsIcon
        icon={status === 'copied' ? CopyCheckIcon : Copy01Icon}
        strokeWidth={2}
      />
      <span className="sr-only">
        {status === 'copied' ? `${label} copied` : status === 'failed' ? `${label} failed` : label}
      </span>
    </Button>
  )
}

function ResponseBodyContent({
  body,
  responseViewMode,
  emptyLabel = 'Empty response body',
}: {
  body: string
  responseViewMode: ResponseViewMode
  emptyLabel?: string
}) {
  const trimmedBody = body.trim()

  if (!trimmedBody) {
    return (
      <pre className="min-w-max p-3 text-xs leading-5 font-mono whitespace-pre [overflow-wrap:normal] [word-break:normal]">
        {emptyLabel}
      </pre>
    )
  }

  const parsedJson = responseViewMode === 'text' ? { ok: false as const } : parseJsonSafely(body)

  if (parsedJson.ok) {
    return <JsonTreeViewer value={parsedJson.value as JsonValue} />
  }

  return (
    <pre className="min-w-max p-3 text-xs leading-5 font-mono whitespace-pre [overflow-wrap:normal] [word-break:normal]">
      {formatResponseBody(body, responseViewMode)}
    </pre>
  )
}

function RawPayloadPanel({
  body,
  copyLabel,
  emptyLabel,
}: {
  body: string
  copyLabel: string
  emptyLabel: string
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
      <div className="flex justify-end">
        <CopyTextButton text={body} label={copyLabel} />
      </div>
      <div className="h-full min-w-0 overflow-x-auto overflow-y-auto border border-border bg-background">
        <pre className="min-w-max p-3 text-xs leading-5 font-mono whitespace-pre [overflow-wrap:normal] [word-break:normal]">
          {body || emptyLabel}
        </pre>
      </div>
    </div>
  )
}

export function ResponsePanel({
  operation,
  requestSnapshot,
  result,
  error,
  isLoading,
  activeTab,
  onTabChange,
  responseViewMode,
  onResponseViewModeChange,
}: {
  operation: ApiOperation
  requestSnapshot: RequestSnapshot | null
  result: RequestResult | null
  error: RequestErrorState | null
  isLoading: boolean
  activeTab: 'response' | 'expected'
  onTabChange: (value: 'response' | 'expected') => void
  responseViewMode: ResponseViewMode
  onResponseViewModeChange: (value: ResponseViewMode) => void
}) {
  const responseBody = result?.body ?? error?.body ?? ''
  const hasResponseBody = responseBody.trim().length > 0
  const rawRequest = requestSnapshot ? formatRawRequest(requestSnapshot) : ''
  const rawResponse = result ? formatRawResponse(result) : ''
  const hasRawResponse = rawResponse.trim().length > 0

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col border-t border-border bg-card">
      {error ? (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <div className="flex flex-wrap items-center gap-2">
            {error.status ? (
              <Badge variant="destructive">
                {error.status} {error.statusText}
              </Badge>
            ) : null}
            <span>{error.message}</span>
          </div>
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as 'response' | 'expected')} className="min-h-0 flex-1">
        <div className="flex items-center justify-between border-b border-border px-4">
          <TabsList variant="line">
            <TabsTrigger value="response">Response</TabsTrigger>
            <TabsTrigger value="expected">
              Expected Response ({operation.responses.length})
            </TabsTrigger>
          </TabsList>

          {result ? (
            <div className="flex flex-wrap items-center gap-2 py-3">
              <Badge variant={result.ok ? 'secondary' : 'destructive'}>
                {result.status} {result.statusText}
              </Badge>
              <Badge variant="outline">
                {Math.round(result.durationMs)} ms
              </Badge>
            </div>
          ) : null}
        </div>

        <TabsContent value="response" className="min-h-0 flex-1">
          {isLoading ? (
            <div className="flex h-full items-center justify-center px-4 py-8 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border border-current border-t-transparent" />
                Waiting for response...
              </span>
            </div>
          ) : result || error || requestSnapshot ? (
            <Tabs defaultValue="body" className="min-h-0 flex h-full flex-col">
              <TabsList variant="line" className="border-b border-border px-4">
                <TabsTrigger value="body">Body</TabsTrigger>
                {result ? (
                  <TabsTrigger value="headers">
                    Headers ({result.headers.length})
                  </TabsTrigger>
                ) : null}
                {requestSnapshot ? <TabsTrigger value="raw-request">Raw Request</TabsTrigger> : null}
                <TabsTrigger value="raw-response">Raw Response</TabsTrigger>
              </TabsList>

              <TabsContent value="body" className="min-h-0 min-w-0 flex-1 px-4 py-4">
                <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {result ? (
                        <>
                          <Badge variant={result.ok ? 'secondary' : 'destructive'}>
                            {result.status} {result.statusText}
                          </Badge>
                          <Badge variant="outline">
                            {Math.round(result.durationMs)} ms
                          </Badge>
                        </>
                      ) : error?.status ? (
                        <>
                          <Badge variant="destructive">
                            {error.status} {error.statusText}
                          </Badge>
                          <Badge variant="outline">Request error</Badge>
                        </>
                      ) : (
                        <Badge variant="outline">Request error</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <CopyTextButton text={responseBody} label="Copy body" />
                      <Select
                        value={responseViewMode}
                        onValueChange={(value) => onResponseViewModeChange(value as ResponseViewMode)}
                      >
                        <SelectTrigger size="sm" className="w-auto bg-background">
                          <SelectValue placeholder="Viewer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="text">Plain text</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="h-full min-w-0 overflow-x-auto overflow-y-auto border border-border bg-background">
                    <ResponseBodyContent
                      body={responseBody}
                      responseViewMode={responseViewMode}
                      emptyLabel={hasResponseBody ? 'Empty response body' : 'No response body returned.'}
                    />
                  </div>
                </div>
              </TabsContent>

              {result ? (
                <TabsContent value="headers" className="min-h-0 flex-1 px-4 py-4">
                  <div className="h-full overflow-auto border border-border">
                    <Table>
                      <TableBody>
                        {result.headers.map(([name, value]) => (
                          <TableRow key={name}>
                            <TableCell className="font-medium text-sm">{name}</TableCell>
                            <TableCell className="whitespace-normal break-all text-sm text-muted-foreground">
                              {value}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              ) : null}

              {requestSnapshot ? (
                <TabsContent value="raw-request" className="min-h-0 flex-1 px-4 py-4">
                  <RawPayloadPanel
                    body={rawRequest}
                    copyLabel="Copy request"
                    emptyLabel="No raw request captured."
                  />
                </TabsContent>
              ) : null}

              <TabsContent value="raw-response" className="min-h-0 flex-1 px-4 py-4">
                {result ? (
                  <RawPayloadPanel
                    body={rawResponse}
                    copyLabel="Copy response"
                    emptyLabel="No raw response captured."
                  />
                ) : (
                  <div className="flex h-full items-center justify-center border border-border bg-background px-4 py-8 text-sm text-muted-foreground">
                    {error?.message ?? (hasRawResponse ? '' : 'No response was returned.')}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex h-full items-center justify-center px-4 py-8 text-sm text-muted-foreground">
              Send a request to get a response.
            </div>
          )}
        </TabsContent>

        <TabsContent value="expected" className="min-h-0 flex-1 overflow-auto px-4 py-4">
          {operation.responses.length > 0 ? (
            <Accordion>
              {operation.responses.map((response) => (
                <AccordionItem key={response.statusCode} value={response.statusCode}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-3">
                      <Badge variant={response.statusCode.startsWith('2') ? 'secondary' : 'outline'}>
                        {response.statusCode}
                      </Badge>
                      <span className="text-sm">{response.description || 'Response'}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    {response.contents.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No response body defined.
                      </p>
                    ) : (
                      response.contents.map((content) => (
                        <div
                          key={`${response.statusCode}-${content.contentType}`}
                          className="space-y-2 border-l-2 border-border pl-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{content.contentType}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {content.schemaLabel}
                            </span>
                          </div>
                          {content.example ? (
                            <div className="overflow-x-auto border border-border bg-background">
                              <ResponseBodyContent
                                body={content.example}
                                responseViewMode={responseViewMode}
                                emptyLabel="No example body provided."
                              />
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No example body provided.
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No documented responses for this operation.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
