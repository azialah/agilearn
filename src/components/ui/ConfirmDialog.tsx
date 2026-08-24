import { useState, type ReactNode } from 'react'
import { Input } from './Input'
import { Label } from './Label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './Dialog'
import { Button } from './Button'
import { useLocale } from '@/lib/locale'

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  confirmVariant = 'danger',
  confirmPhrase,
  onConfirm,
}: {
  trigger: ReactNode
  title: string
  description?: string
  /** Defaults to the localized "Delete" — this dialog is mostly a delete gate. */
  confirmLabel?: string
  confirmVariant?: React.ComponentProps<typeof Button>['variant']
  /** When set, the phrase must be typed exactly before confirming (GitHub-style). */
  confirmPhrase?: string
  onConfirm: () => void | Promise<void>
}) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [typed, setTyped] = useState('')
  const locked = !!confirmPhrase && typed.trim() !== confirmPhrase

  async function handleConfirm() {
    setBusy(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setTyped('')
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {confirmPhrase && (
          <div className="space-y-2">
            <Label htmlFor="confirm-phrase">
              {t('commonTypeToConfirm', { phrase: confirmPhrase })}
            </Label>
            <Input
              id="confirm-phrase"
              value={typed}
              autoComplete="off"
              onChange={(event) => setTyped(event.target.value)}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('commonCancel')}
          </Button>
          <Button
            variant={confirmVariant}
            loading={busy}
            disabled={locked}
            onClick={handleConfirm}
          >
            {confirmLabel ?? t('commonDelete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
