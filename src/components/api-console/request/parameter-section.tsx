import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
    <div className="overflow-hidden border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-9 w-52">Key</TableHead>
            <TableHead className="h-9">Value</TableHead>
            <TableHead className="h-9 w-64">Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parameters.map((parameter) => (
            <TableRow key={`${location}:${parameter.name}`}>
              <TableCell className="align-top">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-semibold">{parameter.name}</code>
                    {parameter.required ? (
                      <Badge variant="outline" className="h-4 px-1 text-[9px]">REQ</Badge>
                    ) : null}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{parameter.typeLabel}</span>
                </div>
              </TableCell>
              <TableCell>
                <Input
                  value={values[parameter.name] ?? ''}
                  onChange={(event) => onChange(parameter.name, event.target.value)}
                  placeholder={parameter.exampleValue || parameter.defaultValue || `Enter ${parameter.name}`}
                  className="h-8 bg-background"
                />
              </TableCell>
              <TableCell className="whitespace-normal text-[11px] text-muted-foreground">
                {parameter.description || ' '}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
