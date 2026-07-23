import { cn } from '@/lib/cn'

export function TableContainer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'scrollbar-thin overflow-x-auto rounded-lg border border-(--color-border)',
        className,
      )}
      {...props}
    />
  )
}

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full border-collapse text-sm', className)} {...props} />
}

export function THead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'bg-(--color-surface-2) text-left text-xs uppercase tracking-wide text-(--color-ink-faint)',
        className,
      )}
      {...props}
    />
  )
}

export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-t border-(--color-border) transition-colors hover:bg-(--color-surface-1)',
        className,
      )}
      {...props}
    />
  )
}

export function TH({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('px-4 py-2.5 font-medium', className)} {...props} />
}

export function TD({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-2.5 text-(--color-ink)', className)} {...props} />
}
