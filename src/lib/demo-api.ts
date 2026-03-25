export type StackStatus = {
  id: string
  name: string
  status: string
}

const stackStatus: StackStatus[] = [
  { id: 'router', name: 'TanStack Router', status: 'Configured' },
  { id: 'query', name: 'React Query', status: 'Provider ready' },
  { id: 'state', name: 'Zustand', status: 'Store ready' },
]

export async function getStackStatus() {
  await new Promise((resolve) => setTimeout(resolve, 150))
  return stackStatus
}
