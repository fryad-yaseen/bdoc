import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import type { ApiOperation } from '@/lib/openapi'
import { EndpointItem } from './endpoint-item'

export function EndpointList({
  groupedOperations,
  selectedOperationKey,
  onSelectOperation,
}: {
  groupedOperations: Record<string, ApiOperation[]>
  selectedOperationKey: string
  onSelectOperation: (operationKey: string) => void
}) {
  const tags = Object.keys(groupedOperations)

  if (tags.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">
        No endpoints match the current filter.
      </p>
    )
  }

  return (
    <Accordion>
      {tags.map((tag) => {
        const operations = groupedOperations[tag]
        return (
          <AccordionItem key={tag} value={tag} className="border-b-0">
            <AccordionTrigger className="px-2">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">{tag}</p>
                <p className="text-xs font-normal text-muted-foreground">
                  {operations.length} endpoint{operations.length === 1 ? '' : 's'}
                </p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-1 pb-3">
              {operations.map((operation) => (
                <EndpointItem
                  key={operation.key}
                  operation={operation}
                  selected={operation.key === selectedOperationKey}
                  onClick={() => onSelectOperation(operation.key)}
                />
              ))}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
