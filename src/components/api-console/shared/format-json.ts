export type ResponseViewMode = 'auto' | 'json' | 'text'

export function parseJsonSafely(input: string): { ok: true; value: unknown } | { ok: false } {
  if (!input.trim()) {
    return { ok: false }
  }

  try {
    return { ok: true, value: JSON.parse(input) }
  } catch {
    return { ok: false }
  }
}

export function formatJson(input: string): string {
  if (!input.trim()) {
    return ''
  }

  const parsed = parseJsonSafely(input)

  if (!parsed.ok) {
    return input
  }

  return JSON.stringify(parsed.value, null, 2)
}

export function formatResponseBody(input: string, mode: ResponseViewMode): string {
  if (!input.trim()) {
    return ''
  }

  if (mode === 'text') {
    return input
  }

  return formatJson(input)
}
