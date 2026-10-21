import type { ColumnMapping, SheetMapping } from '@/lib/gradeSheetConfig'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { TableContainer, Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { cn } from '@/lib/cn'
import { defaultActivityTarget, type DetectedSheet } from './classRecord'

type Role = ColumnMapping['role']

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'ignore', label: 'Ignore' },
  { value: 'activity', label: 'Activity score' },
  { value: 'studentNo', label: 'Student number' },
  { value: 'fullName', label: 'Full name' },
  { value: 'lastName', label: 'Last name' },
  { value: 'firstName', label: 'First name' },
  { value: 'middleName', label: 'Middle name / initial' },
]

const SELECT =
  'h-8 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-2 text-base md:text-sm'

interface Props {
  sheet: DetectedSheet
  mapping: SheetMapping
  onChange: (mapping: SheetMapping) => void
  periodOptions: string[]
  categoryOptions: string[]
}

export function ColumnMappingTable({
  sheet,
  mapping,
  onChange,
  periodOptions,
  categoryOptions,
}: Props) {
  const listId = `cr-${sheet.key}`

  function setColumn(key: string, next: ColumnMapping) {
    onChange({ ...mapping, columns: { ...mapping.columns, [key]: next } })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <label htmlFor={`${listId}-period`} className="text-sm font-medium">
            Grading period for this sheet
          </label>
          <Input
            id={`${listId}-period`}
            list={`${listId}-periods`}
            value={mapping.period}
            onChange={(event) => onChange({ ...mapping, period: event.target.value })}
            placeholder="e.g. Quarter 1"
          />
          <datalist id={`${listId}-periods`}>
            {periodOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <p className="text-xs text-(--color-ink-faint) sm:pb-2">
          {sheet.rows.length} learner row{sheet.rows.length === 1 ? '' : 's'}
          {sheet.headerRowNumber ? ` · header on row ${sheet.headerRowNumber}` : ''}
        </p>
      </div>

      <datalist id={`${listId}-categories`}>
        {categoryOptions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <TableContainer className="max-h-[45vh] overflow-auto">
        <Table>
          <THead className="sticky top-0 z-10">
            <TR>
              <TH className="w-10">Col</TH>
              <TH>Header in file</TH>
              <TH className="w-40">Import as</TH>
              <TH>Activity details</TH>
            </TR>
          </THead>
          <TBody>
            {sheet.columns.map((column) => {
              const current = mapping.columns[column.key] ?? column.suggested
              const label = `Column ${column.letter} (${column.header})`
              return (
                <TR
                  key={column.key}
                  className={cn(current.role === 'ignore' && 'opacity-60')}
                >
                  <TD className="align-top text-(--color-ink-faint)">{column.letter}</TD>
                  <TD className="align-top">
                    <div className="max-w-56 space-y-1">
                      <p className="truncate font-medium" title={column.header}>
                        {column.header}
                      </p>
                      {column.sample.length > 0 && (
                        <p className="truncate text-xs text-(--color-ink-faint)">
                          {column.sample.join(' · ')}
                        </p>
                      )}
                      {column.note && (
                        <p
                          className={cn(
                            'text-xs',
                            column.maxInferred
                              ? 'text-(--color-warning)'
                              : 'text-(--color-ink-faint)',
                          )}
                        >
                          {column.note}
                        </p>
                      )}
                    </div>
                  </TD>
                  <TD className="align-top">
                    <select
                      aria-label={`Import ${label} as`}
                      value={current.role}
                      onChange={(event) => {
                        const role =
                          ROLE_OPTIONS.find(
                            (option) => option.value === event.target.value,
                          )?.value ?? 'ignore'
                        if (role === 'activity') {
                          setColumn(column.key, {
                            role,
                            ...defaultActivityTarget(column),
                          })
                        } else {
                          setColumn(column.key, { role })
                        }
                      }}
                      className={SELECT}
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </TD>
                  <TD className="align-top">
                    {current.role === 'activity' ? (
                      <div className="grid min-w-96 grid-cols-[1fr_1fr_5rem] gap-2">
                        <Input
                          aria-label={`Category for ${label}`}
                          list={`${listId}-categories`}
                          value={current.category}
                          onChange={(event) =>
                            setColumn(column.key, {
                              ...current,
                              category: event.target.value,
                            })
                          }
                          placeholder="Category"
                          className="h-8"
                        />
                        <Input
                          aria-label={`Activity name for ${label}`}
                          value={current.name}
                          onChange={(event) =>
                            setColumn(column.key, {
                              ...current,
                              name: event.target.value,
                            })
                          }
                          placeholder="Activity name"
                          className="h-8"
                        />
                        <Input
                          aria-label={`Max score for ${label}`}
                          type="number"
                          min={0}
                          step="any"
                          value={
                            Number.isFinite(current.maxScore) ? current.maxScore : ''
                          }
                          onChange={(event) =>
                            setColumn(column.key, {
                              ...current,
                              maxScore: Number(event.target.value),
                            })
                          }
                          className={cn(
                            'h-8',
                            column.maxInferred && 'border-(--color-warning)',
                          )}
                        />
                        {current.period && current.period !== mapping.period && (
                          <div className="col-span-3">
                            <Badge tone="neutral">Period: {current.period}</Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-(--color-ink-faint)">—</span>
                    )}
                  </TD>
                </TR>
              )
            })}
          </TBody>
        </Table>
      </TableContainer>
    </div>
  )
}
