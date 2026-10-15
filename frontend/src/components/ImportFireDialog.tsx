import { IconLoader2 } from '@tabler/icons-react'
import type { FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { t } from '@/i18n'

type ImportFireDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  place: string
  onPlaceChange: (place: string) => void
  onImageChange: (image: File | null) => void
  onSubmit: () => void
  canSubmit: boolean
  isPending: boolean
  isError: boolean
}

export function ImportFireDialog({
  open,
  onOpenChange,
  place,
  onPlaceChange,
  onImageChange,
  onSubmit,
  canSubmit,
  isPending,
  isError,
}: ImportFireDialogProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t.importFire.title}</DialogTitle>
            <DialogDescription>{t.importFire.description}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="import-image">{t.importFire.image}</Label>
            <Input
              id="import-image"
              type="file"
              accept="image/jpeg,image/png"
              disabled={isPending}
              onChange={(event) => onImageChange(event.target.files!.item(0))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="import-place">{t.importFire.place}</Label>
            <Input
              id="import-place"
              value={place}
              placeholder={t.importFire.placePlaceholder}
              disabled={isPending}
              onChange={(event) => onPlaceChange(event.target.value)}
            />
          </div>
          {isPending && (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconLoader2 aria-hidden className="size-4 shrink-0 animate-spin" />
              {t.importFire.running}
            </p>
          )}
          {isError && (
            <p role="alert" className="text-sm text-destructive">
              {t.importFire.error}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t.importFire.cancel}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!canSubmit}>
              {t.importFire.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
