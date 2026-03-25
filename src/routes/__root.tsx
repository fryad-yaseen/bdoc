import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import { Button } from '@/components/ui/button'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col border-x bg-background text-foreground">
        <header className="border-b px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                bdoc
              </p>
              <h1 className="font-heading text-xl">File-Based TanStack Router</h1>
            </div>
            <nav className="flex items-center gap-2">
              <Button
                variant="outline"
                render={
                  <Link
                    to="/"
                    activeProps={{ className: 'bg-muted text-foreground' }}
                  />
                }
              >
                Home
              </Button>
              <Button
                variant="outline"
                render={
                  <Link
                    to="/about"
                    activeProps={{ className: 'bg-muted text-foreground' }}
                  />
                }
              >
                About
              </Button>
            </nav>
          </div>
        </header>

        <main className="flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
      <TanStackRouterDevtools />
    </>
  )
}