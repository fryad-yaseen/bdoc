import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { HotkeysProvider } from '@tanstack/react-hotkeys'

import { TooltipProvider } from '@/components/ui/tooltip'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <TooltipProvider>
      <HotkeysProvider
        defaultOptions={{
          hotkey: {
            preventDefault: true,
          },
        }}
      >
        <main>
          <Outlet />
        </main>
        <TanStackRouterDevtools />
      </HotkeysProvider>
    </TooltipProvider>
  )
}
