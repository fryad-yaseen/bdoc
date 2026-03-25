import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ApiOperation } from '@/lib/openapi'

export function BodyEditor({
  operation,
  selectedContentType,
  bodyValue,
  onContentTypeChange,
  onBodyChange,
}: {
  operation: ApiOperation
  selectedContentType: string
  bodyValue: string
  onContentTypeChange: (contentType: string) => void
  onBodyChange: (value: string) => void
}) {
  if (operation.requestBodyContents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No request body for this operation.</p>
    )
  }

  const exampleBody =
    operation.requestBodyContents.find((c) => c.contentType === selectedContentType)?.example ?? ''

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Select
          value={selectedContentType}
          onValueChange={(value) => {
            if (value) onContentTypeChange(value)
          }}
        >
          <SelectTrigger size="sm" className="w-auto">
            <SelectValue placeholder="Content type" />
          </SelectTrigger>
          <SelectContent>
            {operation.requestBodyContents.map((content) => (
              <SelectItem key={content.contentType} value={content.contentType}>
                {content.contentType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {exampleBody && bodyValue !== exampleBody ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onBodyChange(exampleBody)}
          >
            Paste example
          </Button>
        ) : null}
      </div>
      <Textarea
        className="min-h-48 font-mono text-xs"
        value={bodyValue}
        onChange={(event) => onBodyChange(event.target.value)}
        placeholder="Request body…"
      />
    </div>
  )
}
