import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function SpecLoader({
  specInput,
  setSpecInput,
  onLoadSpec,
}: {
  specInput: string
  setSpecInput: (value: string) => void
  onLoadSpec: (url: string) => void
}) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
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
        className="h-8 border-sidebar-border bg-sidebar-accent"
      />
      <Button className="h-8 w-full bg-primary/85 text-primary-foreground hover:bg-primary" onClick={() => onLoadSpec(specInput)}>
        Load Spec
      </Button>
    </div>
  )
}
