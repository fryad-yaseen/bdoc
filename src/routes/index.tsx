import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getStackStatus } from '@/lib/demo-api'
import { useCounterStore } from '@/stores/counter-store'

function HomePage() {
  const count = useCounterStore((state) => state.count)
  const increment = useCounterStore((state) => state.increment)
  const decrement = useCounterStore((state) => state.decrement)
  const reset = useCounterStore((state) => state.reset)

  const stackQuery = useQuery({
    queryKey: ['stack-status'],
    queryFn: getStackStatus,
  })

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Zustand</CardTitle>
          <CardDescription>Simple global state wired into the app shell.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-5xl">{count}</div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={decrement} variant="outline">
              Decrement
            </Button>
            <Button onClick={increment}>Increment</Button>
            <Button onClick={reset} variant="ghost">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>React Query</CardTitle>
          <CardDescription>Query client and hook baseline are ready.</CardDescription>
        </CardHeader>
        <CardContent>
          {stackQuery.isLoading ? (
            <p className="text-muted-foreground">Loading stack status...</p>
          ) : (
            <ul className="space-y-3">
              {stackQuery.data?.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <span>{item.name}</span>
                  <span className="text-muted-foreground">{item.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={() => stackQuery.refetch()} variant="outline">
            Refetch
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/')({
  component: HomePage,
})
