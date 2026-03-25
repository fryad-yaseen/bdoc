import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatJson } from '../shared/format-json'

type RequestResult = {
  body: string
  durationMs: number
  headers: Array<[string, string]>
  ok: boolean
  status: number
  statusText: string
}

export function ResponsePanel({
  result,
  error,
}: {
  result: RequestResult | null
  error: string
}) {
  if (!result && !error) {
    return null
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {result ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={result.ok ? 'secondary' : 'destructive'}>
              {result.status} {result.statusText}
            </Badge>
            <Badge variant="outline">
              {Math.round(result.durationMs)} ms
            </Badge>
            <span className="text-xs font-medium text-muted-foreground">Response</span>
          </div>

          <Tabs defaultValue="body">
            <TabsList variant="line">
              <TabsTrigger value="body">Body</TabsTrigger>
              <TabsTrigger value="headers">
                Headers ({result.headers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="body" className="pt-3">
              <pre className="max-h-[50vh] overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs leading-5 font-mono">
                {formatJson(result.body) || 'Empty response body'}
              </pre>
            </TabsContent>

            <TabsContent value="headers" className="pt-3">
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableBody>
                    {result.headers.map(([name, value]) => (
                      <TableRow key={name}>
                        <TableCell className="font-medium text-sm">{name}</TableCell>
                        <TableCell className="whitespace-normal break-all text-sm text-muted-foreground">
                          {value}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  )
}
