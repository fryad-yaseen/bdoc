import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'

type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

function isContainer(value: JsonValue): value is JsonValue[] | { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null
}

function getContainerSummary(value: JsonValue[] | { [key: string]: JsonValue }) {
  if (Array.isArray(value)) {
    return value.length === 0 ? '[]' : `Array(${value.length})`
  }

  const size = Object.keys(value).length
  return size === 0 ? '{}' : `Object(${size})`
}

function collectContainerPaths(value: JsonValue, path = '$'): string[] {
  if (!isContainer(value)) {
    return []
  }

  const nestedPaths = Array.isArray(value)
    ? value.flatMap((item, index) => collectContainerPaths(item, `${path}[${index}]`))
    : Object.entries(value).flatMap(([key, item]) => collectContainerPaths(item, `${path}.${key}`))

  return [path, ...nestedPaths]
}

function renderPrimitive(value: JsonPrimitive) {
  if (typeof value === 'string') {
    return <span className="text-emerald-300">"{value}"</span>
  }

  if (typeof value === 'number') {
    return <span className="text-sky-300">{value}</span>
  }

  if (typeof value === 'boolean') {
    return <span className="text-amber-300">{String(value)}</span>
  }

  return <span className="text-rose-300">null</span>
}

function JsonNode({
  label,
  value,
  path,
  depth,
  collapsedPaths,
  onToggle,
}: {
  label?: string
  value: JsonValue
  path: string
  depth: number
  collapsedPaths: Record<string, boolean>
  onToggle: (path: string) => void
}) {
  const isCollapsible = isContainer(value)
  const isCollapsed = collapsedPaths[path] ?? false
  const indentStyle = { paddingLeft: `${depth * 1.1}rem` }

  if (!isCollapsible) {
    return (
      <div style={indentStyle} className="leading-6 whitespace-pre">
        {label ? <span className="text-violet-300">"{label}"</span> : null}
        {label ? <span className="text-muted-foreground">: </span> : null}
        {renderPrimitive(value)}
      </div>
    )
  }

  const entries = Array.isArray(value)
    ? value.map((item, index) => ({
        childLabel: String(index),
        childPath: `${path}[${index}]`,
        childValue: item,
      }))
    : Object.entries(value).map(([key, item]) => ({ childLabel: key, childPath: `${path}.${key}`, childValue: item }))

  return (
    <div>
      <div style={indentStyle} className="flex items-center gap-1 leading-6 whitespace-pre">
        <button
          type="button"
          className="w-4 cursor-pointer text-muted-foreground hover:text-foreground"
          onClick={() => onToggle(path)}
          aria-label={isCollapsed ? 'Expand JSON node' : 'Collapse JSON node'}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? '+' : '-'}
        </button>
        {label ? <span className="text-violet-300">"{label}"</span> : null}
        {label ? <span className="text-muted-foreground">: </span> : null}
        <span className="text-muted-foreground">
          {Array.isArray(value) ? '[' : '{'}
        </span>
        {isCollapsed ? (
          <>
            <span className="text-muted-foreground">{getContainerSummary(value)}</span>
            <span className="text-muted-foreground">
              {Array.isArray(value) ? ']' : '}'}
            </span>
          </>
        ) : null}
      </div>

      {!isCollapsed ? (
        <>
          {entries.length === 0 ? (
            <div style={{ paddingLeft: `${(depth + 1) * 1.1}rem` }} className="leading-6 text-muted-foreground">
              empty
            </div>
          ) : (
            entries.map(({ childLabel, childPath, childValue }) => (
              <JsonNode
                key={childPath}
                label={childLabel}
                value={childValue}
                path={childPath}
                depth={depth + 1}
                collapsedPaths={collapsedPaths}
                onToggle={onToggle}
              />
            ))
          )}
          <div style={indentStyle} className="leading-6 text-muted-foreground whitespace-pre">
            {Array.isArray(value) ? ']' : '}'}
          </div>
        </>
      ) : null}
    </div>
  )
}

export function JsonTreeViewer({ value }: { value: JsonValue }) {
  const [collapsedPaths, setCollapsedPaths] = useState<Record<string, boolean>>({})
  const containerPaths = useMemo(() => collectContainerPaths(value), [value])

  const collapseAll = () => {
    setCollapsedPaths(
      Object.fromEntries(containerPaths.filter((path) => path !== '$').map((path) => [path, true])),
    )
  }

  const expandAll = () => {
    setCollapsedPaths({})
  }

  const togglePath = (path: string) => {
    setCollapsedPaths((current) => ({
      ...current,
      [path]: !(current[path] ?? false),
    }))
  }

  return (
    <div className="min-w-max p-3 text-xs leading-6 font-mono [overflow-wrap:normal] [word-break:normal]">
      <div className="mb-3 flex items-center gap-2">
        <Button type="button" variant="ghost" size="xs" onClick={expandAll}>
          Expand all
        </Button>
        <Button type="button" variant="ghost" size="xs" onClick={collapseAll}>
          Collapse all
        </Button>
      </div>
      <JsonNode value={value} path="$" depth={0} collapsedPaths={collapsedPaths} onToggle={togglePath} />
    </div>
  )
}
