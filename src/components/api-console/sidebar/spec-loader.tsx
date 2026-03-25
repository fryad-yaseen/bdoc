import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function SpecLoader({
  specInput,
  setSpecInput,
  onLoadSpec,
  recentSpecs,
}: {
  specInput: string
  setSpecInput: (value: string) => void
  onLoadSpec: (url: string) => void
  recentSpecs: Array<{ title: string; url: string }>
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <label className="text-xs font-medium text-muted-foreground">
          OpenAPI JSON URL
        </label>
        <Input
          value={specInput}
          onChange={(event) => setSpecInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onLoadSpec(specInput)
            }
          }}
          placeholder="https://example.com/openapi.json"
        />
        <Button className="w-full" onClick={() => onLoadSpec(specInput)}>
          Load Spec
        </Button>
      </div>

      {recentSpecs.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Recent</p>
          <div className="space-y-2">
            {recentSpecs.map((recent) => (
              <Card
                key={recent.url}
                size="sm"
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => {
                  setSpecInput(recent.url)
                  onLoadSpec(recent.url)
                }}
              >
                <CardContent className="px-3 py-2">
                  <p className="text-sm font-medium">{recent.title}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{recent.url}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
