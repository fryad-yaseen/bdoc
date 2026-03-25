import { createFileRoute } from '@tanstack/react-router'

import { ApiConsole } from '@/components/api-console'

function HomePage() {
  return <ApiConsole />
}

export const Route = createFileRoute('/')({
  component: HomePage,
})
