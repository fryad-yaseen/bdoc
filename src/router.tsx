import { useQuery } from '@tanstack/react-query'
import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'

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

function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col border-x">
        <header className="border-b px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                bdoc
              </p>
              <h1 className="font-heading text-xl">Shadcn / Router / Query / Store</h1>
            </div>
            <nav className="flex items-center gap-2">
              <Button variant="outline" render={<Link to="/" />}>
                Home
              </Button>
              <Button variant="outline" render={<Link to="/about" />}>
                About
              </Button>
            </nav>
          </div>
        </header>

        <main className="flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

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

function AboutPage() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>TanStack Router</CardTitle>
        <CardDescription>
          File generation is not required for a small baseline. The router is configured
          manually and ready to scale.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-muted-foreground">
        <p>The app now has a root layout, route navigation, query provider, and a store.</p>
        <p>From here you can split routes into separate files or adopt generated route trees.</p>
      </CardContent>
    </Card>
  )
}

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutPage,
})

const routeTree = rootRoute.addChildren([indexRoute, aboutRoute])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
