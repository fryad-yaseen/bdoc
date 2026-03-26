import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ApiOperation, NormalizedSpec } from '@/lib/openapi'
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
    <div className="flex h-full min-h-0 flex-col">
      <Tabs defaultValue={defaultTab}>
        <TabsList variant="line" className="border-b border-border px-4">
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

        <TabsContent value="params" className="space-y-4 px-4 py-4">
          {hasPathParams ? (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Path parameters</p>
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
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Query parameters</p>
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

        <TabsContent value="body" className="px-4 py-4">
          <BodyEditor
            operation={operation}
            selectedContentType={draft.selectedContentType}
            bodyValue={draft.bodyByContentType[draft.selectedContentType] ?? ''}
            onContentTypeChange={(ct) => onContentTypeChange(draftKey, ct)}
            onBodyChange={(value) => onBodyChange(draftKey, draft.selectedContentType, value)}
          />
        </TabsContent>

        <TabsContent value="auth" className="px-4 py-4">
          <AuthSection
            authToken={authToken}
            onAuthTokenChange={onAuthTokenChange}
            operation={operation}
            spec={spec}
          />
        </TabsContent>

        <TabsContent value="headers" className="px-4 py-4">
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

    </div>
  )
}
