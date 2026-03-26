export type HttpMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'options'
  | 'head'

export type ParameterLocation = 'path' | 'query' | 'header'

export type ParameterDefinition = {
  name: string
  in: ParameterLocation
  required: boolean
  description: string
  typeLabel: string
  defaultValue: string
  exampleValue: string
}

export type RequestBodyContent = {
  contentType: string
  example: string
  schemaLabel: string
}

export type ResponseContent = {
  contentType: string
  example: string
  schemaLabel: string
}

export type ResponseDefinition = {
  statusCode: string
  description: string
  contents: ResponseContent[]
}

export type ServerDefinition = {
  url: string
  resolvedUrl: string
  description: string
}

export type ApiOperation = {
  id: string
  key: string
  method: HttpMethod
  path: string
  summary: string
  description: string
  tag: string
  parameters: ParameterDefinition[]
  requestBodyContents: RequestBodyContent[]
  responses: ResponseDefinition[]
  supportsBearerAuth: boolean
}

export type NormalizedSpec = {
  sourceUrl: string
  title: string
  version: string
  description: string
  servers: ServerDefinition[]
  operations: ApiOperation[]
  hasBearerAuth: boolean
}

export type RequestDraftSeed = {
  pathParams: Record<string, string>
  queryParams: Record<string, string>
  headerParams: Record<string, string>
  bodyByContentType: Record<string, string>
  selectedContentType: string
}

type OpenApiDocument = Record<string, unknown>
type OpenApiSchema = Record<string, unknown>

const HTTP_METHODS: HttpMethod[] = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getPointerValue(document: OpenApiDocument, ref: string): unknown {
  const pointer = ref.slice(2).split('/').map((segment) =>
    segment.replaceAll('~1', '/').replaceAll('~0', '~'),
  )

  let current: unknown = document
  for (const segment of pointer) {
    if (!isRecord(current)) {
      return undefined
    }

    current = current[segment]
  }

  return current
}

function resolveMaybeRef<T>(
  document: OpenApiDocument,
  value: T,
  visited = new Set<string>(),
): T {
  if (!isRecord(value) || typeof value.$ref !== 'string') {
    return value
  }

  if (!value.$ref.startsWith('#/')) {
    throw new Error(`Only internal OpenAPI references are supported. Found: ${value.$ref}`)
  }

  if (visited.has(value.$ref)) {
    throw new Error(`Circular OpenAPI reference detected for ${value.$ref}`)
  }

  const nextVisited = new Set(visited)
  nextVisited.add(value.$ref)

  const resolved = getPointerValue(document, value.$ref)
  if (resolved === undefined) {
    throw new Error(`Could not resolve OpenAPI reference: ${value.$ref}`)
  }

  return resolveMaybeRef(document, resolved as T, nextVisited)
}

function pickText(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function inferSchemaType(schema: OpenApiSchema | undefined): string {
  if (!schema) {
    return 'unknown'
  }

  if (typeof schema.type === 'string') {
    if (typeof schema.format === 'string' && schema.format.length > 0) {
      return `${schema.type} (${schema.format})`
    }

    return schema.type
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return 'enum'
  }

  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    return 'oneOf'
  }

  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    return 'anyOf'
  }

  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    return 'allOf'
  }

  if (schema.properties) {
    return 'object'
  }

  if (schema.items) {
    return 'array'
  }

  return 'unknown'
}

function buildExampleValue(
  document: OpenApiDocument,
  schema: OpenApiSchema | undefined,
  depth = 0,
): unknown {
  if (!schema || depth > 4) {
    return undefined
  }

  const resolved = resolveMaybeRef(document, schema)

  if (resolved.example !== undefined) {
    return resolved.example
  }

  if (resolved.default !== undefined) {
    return resolved.default
  }

  if (Array.isArray(resolved.enum) && resolved.enum.length > 0) {
    return resolved.enum[0]
  }

  const variants = ['oneOf', 'anyOf', 'allOf']
  for (const variant of variants) {
    const options = resolved[variant]
    if (Array.isArray(options) && options.length > 0) {
      return buildExampleValue(document, options[0] as OpenApiSchema, depth + 1)
    }
  }

  switch (resolved.type) {
    case 'string':
      if (resolved.format === 'date-time') return new Date().toISOString()
      if (resolved.format === 'date') return '2026-01-01'
      if (resolved.format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000'
      if (resolved.format === 'email') return 'hello@example.com'
      return 'string'
    case 'integer':
    case 'number':
      return 0
    case 'boolean':
      return true
    case 'array': {
      const item = buildExampleValue(document, resolved.items as OpenApiSchema, depth + 1)
      return item === undefined ? [] : [item]
    }
    case 'object':
    default: {
      const properties = isRecord(resolved.properties)
        ? resolved.properties
        : undefined

      if (!properties) {
        return {}
      }

      const example: Record<string, unknown> = {}
      for (const [key, child] of Object.entries(properties)) {
        example[key] = buildExampleValue(document, child as OpenApiSchema, depth + 1)
      }

      return example
    }
  }
}

function stringifyExample(example: unknown): string {
  if (example === undefined || example === null || example === '') {
    return ''
  }

  if (typeof example === 'string') {
    return example
  }

  try {
    return JSON.stringify(example, null, 2)
  } catch {
    return String(example)
  }
}

function extractMediaExample(
  document: OpenApiDocument,
  mediaType: Record<string, unknown>,
): string {
  if (mediaType.example !== undefined) {
    return stringifyExample(mediaType.example)
  }

  if (isRecord(mediaType.examples)) {
    const firstExample = Object.values(mediaType.examples)[0]
    const resolvedExample = resolveMaybeRef(document, firstExample)
    if (isRecord(resolvedExample) && resolvedExample.value !== undefined) {
      return stringifyExample(resolvedExample.value)
    }
  }

  if (isRecord(mediaType.schema)) {
    return stringifyExample(buildExampleValue(document, mediaType.schema))
  }

  return ''
}

function normalizeParameter(
  document: OpenApiDocument,
  parameter: unknown,
): ParameterDefinition | null {
  const resolved = resolveMaybeRef(document, parameter)
  if (!isRecord(resolved)) {
    return null
  }

  const location = resolved.in
  if (location !== 'path' && location !== 'query' && location !== 'header') {
    return null
  }

  const schema = isRecord(resolved.schema)
    ? resolveMaybeRef(document, resolved.schema)
    : undefined

  const exampleValue =
    resolved.example !== undefined
      ? stringifyExample(resolved.example)
      : stringifyExample(buildExampleValue(document, schema))

  const defaultValue =
    schema && schema.default !== undefined ? stringifyExample(schema.default) : ''

  return {
    name: typeof resolved.name === 'string' ? resolved.name : '',
    in: location,
    required: Boolean(resolved.required) || location === 'path',
    description: pickText(resolved.description),
    typeLabel: inferSchemaType(schema),
    defaultValue,
    exampleValue,
  }
}

function normalizeRequestBody(
  document: OpenApiDocument,
  requestBody: unknown,
): RequestBodyContent[] {
  const resolved = resolveMaybeRef(document, requestBody)
  if (!isRecord(resolved) || !isRecord(resolved.content)) {
    return []
  }

  return Object.entries(resolved.content)
    .map(([contentType, media]) => {
      if (!isRecord(media)) {
        return null
      }

      const schema = isRecord(media.schema)
        ? resolveMaybeRef(document, media.schema)
        : undefined

      return {
        contentType,
        example: extractMediaExample(document, media),
        schemaLabel: inferSchemaType(schema),
      }
    })
    .filter((content): content is RequestBodyContent => content !== null)
}

function normalizeResponses(
  document: OpenApiDocument,
  responses: unknown,
): ResponseDefinition[] {
  if (!isRecord(responses)) {
    return []
  }

  return Object.entries(responses).map(([statusCode, response]) => {
    const resolved = resolveMaybeRef(document, response)
    const content = isRecord(resolved) && isRecord(resolved.content) ? resolved.content : {}

    const contents = Object.entries(content).map(([contentType, media]) => {
      const mediaRecord = isRecord(media) ? media : {}
      const schema = isRecord(mediaRecord.schema)
        ? resolveMaybeRef(document, mediaRecord.schema)
        : undefined

      return {
        contentType,
        example: extractMediaExample(document, mediaRecord),
        schemaLabel: inferSchemaType(schema),
      }
    })

    return {
      statusCode,
      description:
        isRecord(resolved) && typeof resolved.description === 'string'
          ? resolved.description
          : '',
      contents,
    }
  })
}

function normalizeServers(
  sourceUrl: string,
  document: OpenApiDocument,
): ServerDefinition[] {
  const source = new URL(sourceUrl)
  const rawServers = Array.isArray(document.servers) ? document.servers : []

  if (rawServers.length === 0) {
    return [
      {
        url: source.origin,
        resolvedUrl: source.origin,
        description: 'Default origin inferred from the spec URL.',
      },
    ]
  }

  return rawServers
    .map((server) => {
      if (!isRecord(server) || typeof server.url !== 'string') {
        return null
      }

      return {
        url: server.url,
        resolvedUrl: new URL(server.url, source).toString(),
        description: pickText(server.description),
      }
    })
    .filter((server): server is ServerDefinition => server !== null)
}

function hasBearerScheme(document: OpenApiDocument): boolean {
  const securitySchemes = isRecord(document.components) && isRecord(document.components.securitySchemes)
    ? document.components.securitySchemes
    : undefined

  if (!securitySchemes) {
    return false
  }

  return Object.values(securitySchemes).some((scheme) => {
    const resolved = resolveMaybeRef(document, scheme)
    return (
      isRecord(resolved) &&
      resolved.type === 'http' &&
      typeof resolved.scheme === 'string' &&
      resolved.scheme.toLowerCase() === 'bearer'
    )
  })
}

function operationSupportsBearerAuth(
  document: OpenApiDocument,
  operation: Record<string, unknown>,
  documentHasBearerAuth: boolean,
): boolean {
  if (!documentHasBearerAuth) {
    return false
  }

  if (!Array.isArray(operation.security) && !Array.isArray(document.security)) {
    return documentHasBearerAuth
  }

  const securityEntries = Array.isArray(operation.security)
    ? operation.security
    : Array.isArray(document.security)
      ? document.security
      : []
  if (securityEntries.length === 0) {
    return false
  }

  return securityEntries.some((entry) => isRecord(entry) && Object.keys(entry).length > 0)
}

export async function loadOpenApiSpec(sourceUrl: string): Promise<NormalizedSpec> {
  const response = await fetch(getFetchTarget(sourceUrl))
  if (!response.ok) {
    throw new Error(`Failed to load spec: ${response.status} ${response.statusText}`)
  }

  const document = (await response.json()) as OpenApiDocument
  if (typeof document.openapi !== 'string' || !document.openapi.startsWith('3.')) {
    throw new Error('Only OpenAPI 3.x JSON documents are supported in this version.')
  }

  const info = isRecord(document.info) ? document.info : {}
  const bearerAuth = hasBearerScheme(document)
  const operations: ApiOperation[] = []

  const paths = isRecord(document.paths) ? document.paths : {}
  for (const [path, pathItem] of Object.entries(paths)) {
    const pathRecord = resolveMaybeRef(document, pathItem)
    if (!isRecord(pathRecord)) {
      continue
    }

    const sharedParameters = Array.isArray(pathRecord.parameters)
      ? pathRecord.parameters
      : []

    for (const method of HTTP_METHODS) {
      const operation = pathRecord[method]
      if (!isRecord(operation)) {
        continue
      }

      const operationParameters = Array.isArray(operation.parameters)
        ? operation.parameters
        : []

      const mergedParameters = [...sharedParameters, ...operationParameters]
      const parameterMap = new Map<string, ParameterDefinition>()

      for (const parameter of mergedParameters) {
        const normalized = normalizeParameter(document, parameter)
        if (!normalized || normalized.name.length === 0) {
          continue
        }

        parameterMap.set(`${normalized.in}:${normalized.name}`, normalized)
      }

      const summary = pickText(operation.summary) || `${method.toUpperCase()} ${path}`
      const operationId =
        typeof operation.operationId === 'string' && operation.operationId.length > 0
          ? operation.operationId
          : `${method}:${path}`

      operations.push({
        id: operationId,
        key: `${method.toUpperCase()} ${path}`,
        method,
        path,
        summary,
        description: pickText(operation.description),
        tag:
          Array.isArray(operation.tags) && typeof operation.tags[0] === 'string'
            ? operation.tags[0]
            : 'General',
        parameters: [...parameterMap.values()],
        requestBodyContents: normalizeRequestBody(document, operation.requestBody),
        responses: normalizeResponses(document, operation.responses),
        supportsBearerAuth: operationSupportsBearerAuth(document, operation, bearerAuth),
      })
    }
  }

  operations.sort((left, right) => {
    if (left.tag !== right.tag) {
      return left.tag.localeCompare(right.tag)
    }

    if (left.path !== right.path) {
      return left.path.localeCompare(right.path)
    }

    return left.method.localeCompare(right.method)
  })

  return {
    sourceUrl,
    title: pickText(info.title) || 'Untitled API',
    version: pickText(info.version),
    description: pickText(info.description),
    servers: normalizeServers(sourceUrl, document),
    operations,
    hasBearerAuth: bearerAuth,
  }
}

export function getFetchTarget(url: string): string {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return url
  }

  const target = new URL(url, window.location.href)
  if (target.origin === window.location.origin) {
    return target.toString()
  }

  return `/__bdoc_proxy?url=${encodeURIComponent(target.toString())}`
}

export function createInitialDraft(operation: ApiOperation): RequestDraftSeed {
  const pathParams: Record<string, string> = {}
  const queryParams: Record<string, string> = {}
  const headerParams: Record<string, string> = {}

  for (const parameter of operation.parameters) {
    const initialValue = parameter.exampleValue || parameter.defaultValue

    if (parameter.in === 'path') {
      pathParams[parameter.name] = initialValue
    }

    if (parameter.in === 'query') {
      queryParams[parameter.name] = initialValue
    }

    if (parameter.in === 'header') {
      headerParams[parameter.name] = initialValue
    }
  }

  const selectedContentType = operation.requestBodyContents[0]?.contentType ?? ''
  const bodyByContentType = Object.fromEntries(
    operation.requestBodyContents.map((content) => [content.contentType, content.example]),
  )

  return {
    pathParams,
    queryParams,
    headerParams,
    bodyByContentType,
    selectedContentType,
  }
}

export function buildRequestUrl(
  serverUrl: string,
  path: string,
  pathParams: Record<string, string>,
  queryParams: Record<string, string>,
): string {
  let compiledPath = path

  for (const [name, value] of Object.entries(pathParams)) {
    compiledPath = compiledPath.replaceAll(`{${name}}`, encodeURIComponent(value))
  }

  const baseUrl = new URL(serverUrl)
  const basePath = baseUrl.pathname.replace(/\/+$/, '')
  const operationPath = compiledPath.replace(/^\/+/, '')

  baseUrl.pathname = `${basePath}/${operationPath}`.replace(/\/{2,}/g, '/')

  for (const [name, value] of Object.entries(queryParams)) {
    if (value.trim().length > 0) {
      baseUrl.searchParams.set(name, value)
    }
  }

  return baseUrl.toString()
}
