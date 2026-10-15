import { IconLoader2, IconPhotoUp } from '@tabler/icons-react'
import type { FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { t } from '@/i18n'

type ImportFireDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  place: string
  onPlaceChange: (place: string) => void
  imageName: string | null
  onImageChange: (image: File | null) => void
  onSubmit: () => void
  canSubmit: boolean
  isPending: boolean
  errorMessage: string | null
}

export function ImportFireDialog({
  open,
  onOpenChange,
  place,
  onPlaceChange,
  imageName,
  onImageChange,
  onSubmit,
  canSubmit,
  isPending,
  errorMessage,
}: ImportFireDialogProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-3">
          <DialogHeader>
            <DialogTitle>{t.importFire.title}</DialogTitle>
          </DialogHeader>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input px-3 py-4 text-muted-foreground transition-colors hover:bg-muted/50 has-focus-visible:ring-2 has-focus-visible:ring-ring has-disabled:cursor-not-allowed has-disabled:opacity-50">
            <IconPhotoUp aria-hidden className="size-5 shrink-0" />
            <span className={imageName === null ? 'min-w-0 truncate' : 'min-w-0 truncate text-foreground'}>
              {imageName === null ? t.importFire.chooseImage : imageName}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              disabled={isPending}
              onChange={(event) => onImageChange(event.target.files!.item(0))}
            />
          </label>
          <Input
            aria-label={t.importFire.placePlaceholder}
            value={place}
            placeholder={t.importFire.placePlaceholder}
            disabled={isPending}
            onChange={(event) => onPlaceChange(event.target.value)}
          />
          {errorMessage !== null && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          )}
          <Button type="submit" disabled={!canSubmit} className="w-full">
            {isPending && <IconLoader2 aria-hidden className="animate-spin" />}
            {isPending ? t.importFire.running : t.importFire.submit}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
