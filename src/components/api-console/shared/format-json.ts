export function formatJson(input: string): string {
  if (!input.trim()) {
    return ''
  }

  try {
    return JSON.stringify(JSON.parse(input), null, 2)
  } catch {
    return input
  }
}
