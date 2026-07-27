import { useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import {
  ResponsiveDrawer,
  ResponsiveDrawerBody,
  ResponsiveDrawerContent,
  ResponsiveDrawerHeader,
} from '@/components/ui/ResponsiveDrawer'
import { Button } from '@/components/ui/Button'
import { legalPageHref } from '@/features/public/legalReturn'

type LegalDocument = 'privacy' | 'terms'

const summaries: Record<
  LegalDocument,
  { title: string; summary: string; linkLabel: string }
> = {
  privacy: {
    title: 'Privacy Notice',
    summary:
      'This draft explains the kinds of classroom and account information Agilearn is designed to use, why it is used, and the privacy details that still need legal confirmation before publication.',
    linkLabel: 'Read full Privacy Policy',
  },
  terms: {
    title: 'Terms of Use',
    summary:
      'This draft covers appropriate use of Agilearn for classrooms, records, and teaching materials. The final binding terms still require the service operator, support, pricing, and legal details.',
    linkLabel: 'Read full Terms of Use',
  },
}

export function ConsentSummaryLink({
  document,
  children,
  returnTo,
}: {
  document: LegalDocument
  children: React.ReactNode
  returnTo?: string
}) {
  const [open, setOpen] = useState(false)
  const content = summaries[document]

  return (
    <ResponsiveDrawer open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-semibold underline decoration-(--color-ink-muted) underline-offset-2 transition-colors hover:text-(--color-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)"
      >
        {children}
      </button>
      <ResponsiveDrawerContent className="md:max-w-xl">
        <ResponsiveDrawerHeader
          title={content.title}
          description="A short summary before you leave this screen."
        />
        <ResponsiveDrawerBody>
          <p className="text-sm leading-7 text-(--color-ink-muted)">{content.summary}</p>
          <p className="mt-4 rounded-xl bg-(--color-surface-2) p-4 text-sm leading-6 text-(--color-ink-muted)">
            This is a draft for legal review, not the final published legal notice.
          </p>
          <a
            href={legalPageHref(document, returnTo)}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-(--color-accent-400) px-6 text-base font-medium text-(--color-accent-fg) transition-colors hover:bg-(--color-accent-500) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400) focus-visible:ring-offset-2 sm:w-auto"
          >
            {content.linkLabel} <ExternalLink className="size-4" aria-hidden="true" />
          </a>
          <Button
            type="button"
            variant="ghost"
            className="mt-3 w-full sm:w-auto sm:ml-2"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" aria-hidden="true" /> Close
          </Button>
        </ResponsiveDrawerBody>
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  )
}
