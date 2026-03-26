import { useEffect, useState } from 'react'
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
  const [openTags, setOpenTags] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setOpenTags((current) => {
      const next = { ...current }
      for (const tag of tags) {
        if (next[tag] === undefined) {
          next[tag] = true
        }
      }

      for (const tag of tags) {
        const hasSelectedOperation = groupedOperations[tag]?.some(
          (operation) => operation.key === selectedOperationKey,
        )
        if (hasSelectedOperation) {
          next[tag] = true
        }
      }

      return next
    })
  }, [groupedOperations, selectedOperationKey, tags])

  if (tags.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">
        No endpoints match the current filter.
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {tags.map((tag) => {
        const operations = groupedOperations[tag]
        const isOpen = openTags[tag] ?? true
        return (
          <section key={tag}>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] font-semibold hover:bg-accent/40"
              onClick={() => setOpenTags((current) => ({ ...current, [tag]: !isOpen }))}
            >
              <span className="w-3 text-center text-muted-foreground">{isOpen ? '▾' : '▸'}</span>
              <span className="truncate">{tag}</span>
              <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                {operations.length}
              </span>
            </button>
            {isOpen ? (
              <div className="ml-3 border-l border-border/70 py-1">
                {operations.map((operation) => (
                  <EndpointItem
                    key={operation.key}
                    operation={operation}
                    selected={operation.key === selectedOperationKey}
                    onClick={() => onSelectOperation(operation.key)}
                  />
                ))}
              </div>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}
