import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableContainer, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { studentFullName, type Student } from '@/types/domain'
import type { ClassSessionWithRecords } from '@/lib/queries/attendance'
import {
  computeClassAttendanceRate,
  computeClassSummary,
  computeSessionTrend,
  formatRate,
  type StudentAttendanceSummary,
  type SummarySort,
} from './summary'
import { STATUS_META } from './status'

function rateTone(rate: number | null) {
  if (rate === null) return 'var(--color-ink-faint)'
  if (rate >= 0.9) return 'var(--color-success)'
  if (rate >= 0.75) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

function RateBar({ rate }: { rate: number | null }) {
  const pct = rate === null ? 0 : Math.round(rate * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: rateTone(rate) }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-[var(--color-ink-muted)]">
        {formatRate(rate)}
      </span>
    </div>
  )
}

function TrendStrip({ sessions }: { sessions: ClassSessionWithRecords[] }) {
  const trend = useMemo(() => computeSessionTrend(sessions), [sessions])
  if (trend.length === 0) return null
  return (
    <div className="flex items-end gap-1" aria-hidden>
      {trend.map((point) => {
        const pct = point.rate === null ? 0 : Math.round(point.rate * 100)
        return (
          <motion.div
            key={point.sessionId}
            className="w-2 rounded-full"
            style={{
              backgroundColor:
                point.rate === null ? 'var(--color-surface-3)' : rateTone(point.rate),
            }}
            initial={{ height: 4 }}
            animate={{ height: 4 + (pct / 100) * 28 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        )
      })}
    </div>
  )
}

export function AttendanceSummary({
  students,
  sessions,
}: {
  students: Student[]
  sessions: ClassSessionWithRecords[]
}) {
  const [sort, setSort] = useState<SummarySort>('name')

  const allRecords = useMemo(
    () => sessions.flatMap((session) => session.attendance_records),
    [sessions],
  )

  const nameById = useMemo(
    () => new Map(students.map((student) => [student.id, studentFullName(student)])),
    [students],
  )

  const rows = useMemo(() => {
    const summaries = computeClassSummary(students, allRecords)
    const sorted = [...summaries]
    if (sort === 'rate') {
      sorted.sort((a, b) => {
        const ra = a.rate ?? -1
        const rb = b.rate ?? -1
        if (rb !== ra) return rb - ra
        return (nameById.get(a.studentId) ?? '').localeCompare(
          nameById.get(b.studentId) ?? '',
        )
      })
    } else {
      sorted.sort((a, b) =>
        (nameById.get(a.studentId) ?? '').localeCompare(nameById.get(b.studentId) ?? ''),
      )
    }
    return sorted
  }, [students, allRecords, sort, nameById])

  const classRate = useMemo(() => computeClassAttendanceRate(allRecords), [allRecords])

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Attendance report</CardTitle>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Per-student rates across {sessions.length}{' '}
            {sessions.length === 1 ? 'session' : 'sessions'}.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <TrendStrip sessions={sessions} />
          <div className="text-right">
            <p
              className="text-2xl font-semibold tabular-nums"
              style={{ color: rateTone(classRate) }}
            >
              {formatRate(classRate)}
            </p>
            <p className="text-xs text-[var(--color-ink-faint)]">class average</p>
          </div>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-3 text-xs text-[var(--color-ink-muted)]">
          <span>Sort by</span>
          <SortToggle
            label="Name"
            active={sort === 'name'}
            onClick={() => setSort('name')}
          />
          <SortToggle
            label="Rate"
            active={sort === 'rate'}
            onClick={() => setSort('rate')}
          />
        </div>
        <TableContainer className="rounded-none border-0">
          <Table>
            <THead>
              <TR>
                <TH>Student</TH>
                <TH className="w-14 text-center">{STATUS_META.present.short}</TH>
                <TH className="w-14 text-center">{STATUS_META.late.short}</TH>
                <TH className="w-14 text-center">{STATUS_META.excused.short}</TH>
                <TH className="w-14 text-center">{STATUS_META.absent.short}</TH>
                <TH className="w-56">Attendance</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => (
                <SummaryRow
                  key={row.studentId}
                  name={nameById.get(row.studentId) ?? 'Unknown student'}
                  summary={row}
                />
              ))}
            </TBody>
          </Table>
        </TableContainer>
      </CardBody>
    </Card>
  )
}

function SortToggle({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-[var(--color-surface-3)] px-2.5 py-1 font-medium text-[var(--color-ink)]'
          : 'rounded-full px-2.5 py-1 hover:text-[var(--color-ink)]'
      }
    >
      {label}
    </button>
  )
}

function CountCell({ value, muted }: { value: number; muted: boolean }) {
  return (
    <TD className="text-center tabular-nums">
      <span className={muted ? 'text-[var(--color-ink-faint)]' : undefined}>{value}</span>
    </TD>
  )
}

function SummaryRow({
  name,
  summary,
}: {
  name: string
  summary: StudentAttendanceSummary
}) {
  return (
    <TR>
      <TD className="font-medium">
        <div className="flex items-center gap-2">
          <span className="truncate">{name}</span>
          {summary.recorded === 0 && <Badge tone="neutral">no records</Badge>}
        </div>
      </TD>
      <CountCell value={summary.counts.present} muted={summary.counts.present === 0} />
      <CountCell value={summary.counts.late} muted={summary.counts.late === 0} />
      <CountCell value={summary.counts.excused} muted={summary.counts.excused === 0} />
      <CountCell value={summary.counts.absent} muted={summary.counts.absent === 0} />
      <TD>
        <RateBar rate={summary.rate} />
      </TD>
    </TR>
  )
}
