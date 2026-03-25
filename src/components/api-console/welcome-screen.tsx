export function WelcomeScreen({ isLoading }: { isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading specification…</p>
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-lg space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">bdoc</p>
          <h2 className="font-heading text-3xl leading-tight">
            API docs &amp; requests in one surface.
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Load a remote OpenAPI JSON document, browse endpoints, edit every request
          parameter, and fire off requests directly from the browser. Auth tokens and
          draft parameters are kept in local storage.
        </p>
        <div className="mx-auto grid max-w-sm gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground">Browse</p>
            <p className="mt-1 text-sm">Tag groups, search, recent specs.</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground">Edit</p>
            <p className="mt-1 text-sm">Params, body, auth — all inline.</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground">Send</p>
            <p className="mt-1 text-sm">Execute and inspect responses live.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
