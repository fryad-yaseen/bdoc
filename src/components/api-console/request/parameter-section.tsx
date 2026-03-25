import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { ApiOperation, ParameterLocation } from '@/lib/openapi'

export function ParameterSection({
  location,
  operation,
  values,
  onChange,
}: {
  location: ParameterLocation
  operation: ApiOperation
  values: Record<string, string>
  onChange: (name: string, value: string) => void
}) {
  const parameters = operation.parameters.filter((parameter) => parameter.in === location)

  if (parameters.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No {location} parameters for this operation.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {parameters.map((parameter) => (
        <div
          key={`${location}:${parameter.name}`}
          className="space-y-1.5 rounded-lg border border-border p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <code className="text-sm font-semibold">{parameter.name}</code>
            <span className="text-xs text-muted-foreground">{parameter.typeLabel}</span>
            {parameter.required ? (
              <Badge variant="outline" className="text-[10px]">Required</Badge>
            ) : null}
          </div>
          {parameter.description ? (
            <p className="text-xs text-muted-foreground">{parameter.description}</p>
          ) : null}
          <Input
            value={values[parameter.name] ?? ''}
            onChange={(event) => onChange(parameter.name, event.target.value)}
            placeholder={parameter.exampleValue || parameter.defaultValue || `Enter ${parameter.name}`}
          />
        </div>
      ))}
    </div>
  )
}
