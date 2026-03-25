import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ApiOperation, NormalizedSpec } from '@/lib/openapi'
import { formatJson } from '../shared/format-json'
import { AuthSection } from './auth-section'
import { BodyEditor } from './body-editor'
import { ParameterSection } from './parameter-section'

type RequestDraft = {
  pathParams: Record<string, string>
  queryParams: Record<string, string>
  headerParams: Record<string, string>
  bodyByContentType: Record<string, string>
  selectedContentType: string
  selectedServerUrl: string
}

export function RequestBuilder({
  operation,
  spec,
  draft,
  authToken,
  draftKey,
  onAuthTokenChange,
  onDraftField,
  onBodyChange,
  onContentTypeChange,
}: {
  operation: ApiOperation
  spec: NormalizedSpec
  draft: RequestDraft
  authToken: string
  draftKey: string
  onAuthTokenChange: (token: string) => void
  onDraftField: (
    draftKey: string,
    section: 'pathParams' | 'queryParams' | 'headerParams',
    name: string,
    value: string,
  ) => void
  onBodyChange: (draftKey: string, contentType: string, value: string) => void
  onContentTypeChange: (draftKey: string, contentType: string) => void
}) {
  const hasPathParams = operation.parameters.some((p) => p.in === 'path')
  const hasQueryParams = operation.parameters.some((p) => p.in === 'query')
  const hasHeaderParams = operation.parameters.some((p) => p.in === 'header')
  const hasBody = operation.requestBodyContents.length > 0
  const hasParams = hasPathParams || hasQueryParams || hasHeaderParams

  // Determine default tab
  const defaultTab = hasParams ? 'params' : hasBody ? 'body' : 'auth'

  return (
    <div className="space-y-6">
      <Tabs defaultValue={defaultTab}>
        <TabsList variant="line">
          <TabsTrigger value="params">
            Params
            {hasParams ? (
              <span className="ml-1 text-[10px] text-muted-foreground">
                ({operation.parameters.length})
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="body">
            Body
            {hasBody ? (
              <span className="ml-1 text-[10px] text-muted-foreground">
                ({operation.requestBodyContents.length})
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="auth">Auth</TabsTrigger>
          <TabsTrigger value="headers">Headers</TabsTrigger>
        </TabsList>

        <TabsContent value="params" className="space-y-5 pt-4">
          {hasPathParams ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Path parameters</p>
              <ParameterSection
                location="path"
                operation={operation}
                values={draft.pathParams}
                onChange={(name, value) => onDraftField(draftKey, 'pathParams', name, value)}
              />
            </div>
          ) : null}
          {hasQueryParams ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Query parameters</p>
              <ParameterSection
                location="query"
                operation={operation}
                values={draft.queryParams}
                onChange={(name, value) => onDraftField(draftKey, 'queryParams', name, value)}
              />
            </div>
          ) : null}
          {!hasPathParams && !hasQueryParams ? (
            <p className="text-sm text-muted-foreground">
              No path or query parameters for this operation.
            </p>
          ) : null}
        </TabsContent>

        <TabsContent value="body" className="pt-4">
          <BodyEditor
            operation={operation}
            selectedContentType={draft.selectedContentType}
            bodyValue={draft.bodyByContentType[draft.selectedContentType] ?? ''}
            onContentTypeChange={(ct) => onContentTypeChange(draftKey, ct)}
            onBodyChange={(value) => onBodyChange(draftKey, draft.selectedContentType, value)}
          />
        </TabsContent>

        <TabsContent value="auth" className="pt-4">
          <AuthSection
            authToken={authToken}
            onAuthTokenChange={onAuthTokenChange}
            operation={operation}
            spec={spec}
          />
        </TabsContent>

        <TabsContent value="headers" className="pt-4">
          {hasHeaderParams ? (
            <ParameterSection
              location="header"
              operation={operation}
              values={draft.headerParams}
              onChange={(name, value) => onDraftField(draftKey, 'headerParams', name, value)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No header parameters for this operation.
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* Expected Responses collapsible */}
      {operation.responses.length > 0 ? (
        <div className="space-y-2">
          <Accordion>
            <AccordionItem value="expected-responses" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3">
                <span className="text-sm font-medium">
                  Expected Responses ({operation.responses.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
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
                                <pre className="overflow-x-auto rounded-md border border-border bg-muted/30 p-3 text-xs leading-5">
                                  {formatJson(content.example)}
                                </pre>
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ) : null}
    </div>
  )
}
