import { createFileRoute } from '@tanstack/react-router'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function AboutPage() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>TanStack Router</CardTitle>
        <CardDescription>
          The app now uses generated file-based routes via the TanStack Router Vite plugin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-muted-foreground">
        <p>The route files live in `src/routes` and produce `src/routeTree.gen.ts`.</p>
        <p>React Query and Zustand remain wired into the app shell.</p>
      </CardContent>
    </Card>
  )
}

export const Route = createFileRoute('/about')({
  component: AboutPage,
})
