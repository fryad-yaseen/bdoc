import { cn } from '@/lib/utils'
import type { HttpMethod } from '@/lib/openapi'

const methodStyles: Record<string, string> = {
  get: 'bg-method-get-bg text-method-get border-method-get/20',
  post: 'bg-method-post-bg text-method-post border-method-post/20',
  put: 'bg-method-put-bg text-method-put border-method-put/20',
  patch: 'bg-method-patch-bg text-method-patch border-method-patch/20',
  delete: 'bg-method-delete-bg text-method-delete border-method-delete/20',
  options: 'bg-method-options-bg text-method-options border-method-options/20',
  head: 'bg-method-head-bg text-method-head border-method-head/20',
}

const defaultStyle = 'bg-muted text-muted-foreground border-border'

export function MethodBadge({
  method,
  className,
}: {
  method: HttpMethod | string
  className?: string
}) {
  const style = methodStyles[method.toLowerCase()] ?? defaultStyle

  return (
    <span
      className={cn(
        'inline-flex h-5 w-16 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold uppercase tracking-wide',
        style,
        className,
      )}
    >
      {method.toUpperCase()}
    </span>
  )
}
