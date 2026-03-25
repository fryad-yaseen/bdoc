import { createFileRoute } from '@tanstack/react-router'

import { ApiConsole } from '@/components/api-console/index'

function HomePage() {
  return <ApiConsole />
}

export const Route = createFileRoute('/')({
  component: HomePage,
})
