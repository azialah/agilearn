import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLocale } from '@/lib/locale'
import { motion } from 'motion/react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast'
import { EditIcon, ModuleIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { useProfile } from '@/lib/queries/profiles'
import {
  createModuleSignedUrl,
  useDeleteModule,
  useImportModuleToSubject,
  useModules,
  type ModuleWithRelations,
} from '@/lib/queries/modules'
import { useAllCourseSubjects } from '@/lib/queries/academicWorkspace'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import {
  ResponsiveDrawer,
  ResponsiveDrawerBody,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
  ResponsiveDrawerHeader,
} from '@/components/ui/ResponsiveDrawer'
import type { ModuleKind } from '@/types/domain'
import { ModuleUploadDialog } from './ModuleUploadDialog'
import { ModuleEditDialog } from './ModuleEditDialog'
import {
  filterModules,
  formatFileSize,
  formatModuleDate,
  MODULE_KIND_META,
  MODULE_KINDS,
  type ModuleFilters,
} from './helpers'

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  )
}

function ModuleCard({
  module,
  canManage,
  onDownload,
  onDelete,
  downloading,
  onImport,
}: {
  module: ModuleWithRelations
  canManage: boolean
  onDownload: (module: ModuleWithRelations) => void
  onDelete: (module: ModuleWithRelations) => void
  downloading: boolean
  onImport: (module: ModuleWithRelations) => void
}) {
  const meta = MODULE_KIND_META[module.kind]
  const { t } = useLocale()
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      whileHover={{ y: -3 }}
    >
      <Card className="flex h-full flex-col">
        <CardBody className="flex flex-1 flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {canManage && (
              <div className="flex items-center gap-1">
                <ModuleEditDialog
                  module={module}
                  trigger={
                    <IconButton label={t('modulesEditModuleAriaLabel')} size="sm">
                      <EditIcon />
                    </IconButton>
                  }
                />
                <ConfirmDialog
                  title={t('modulesDeleteConfirmTitle')}
                  description={t('modulesDeleteConfirmDescription', {
                    title: module.title,
                  })}
                  onConfirm={() => onDelete(module)}
                  trigger={
                    <IconButton
                      label={t('modulesDeleteModuleAriaLabel')}
                      size="sm"
                      variant="danger"
                    >
                      <TrashIcon />
                    </IconButton>
                  }
                />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate font-medium text-(--color-ink)">{module.title}</p>
            {module.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-(--color-ink-muted)">
                {module.description}
              </p>
            ) : (
              <p className="mt-1 text-sm italic text-(--color-ink-faint)">
                {t('modulesNoDescription')}
              </p>
            )}
          </div>

          <div className="mt-auto space-y-3">
            {module.classroom && (
              <Link
                to="/teacher/classrooms/$classroomId"
                params={{ classroomId: module.classroom.id }}
                className="inline-flex max-w-full items-center gap-1 truncate text-xs text-(--color-accent-300) hover:text-(--color-accent-200)"
              >
                {module.classroom.course_code} · {module.classroom.course_name}
              </Link>
            )}

            <div className="flex items-center justify-between gap-2 text-xs text-(--color-ink-faint)">
              <span className="min-w-0 truncate">
                {module.owner?.full_name ?? t('modulesUnknownOwner')}
              </span>
              <span className="shrink-0 tabular-nums">
                {formatFileSize(module.file_size)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-(--color-ink-faint)">
                {formatModuleDate(module.created_at)}
              </span>
              <Button
                size="sm"
                variant="outline"
                loading={downloading}
                onClick={() => onDownload(module)}
              >
                {!downloading && <DownloadIcon />}
                {t('modulesDownloadButton')}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onImport(module)}>
                {t('modulesImportToSubjectButton')}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  )
}

export function ModulesPage() {
  const { t } = useLocale()
  const { data: profile } = useProfile()
  const { data: modules, isLoading } = useModules()
  const deleteModule = useDeleteModule()
  const importModule = useImportModuleToSubject()
  const { data: subjects } = useAllCourseSubjects()
  const { toast } = useToast()

  const [filters, setFilters] = useState<ModuleFilters>({
    search: '',
    kind: 'all',
    mineOnly: false,
  })
  const debouncedSearch = useDebouncedValue(filters.search, 250)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [importingModule, setImportingModule] = useState<ModuleWithRelations | null>(null)
  const [subjectId, setSubjectId] = useState('')

  const isAdmin = profile?.role === 'admin'

  const visible = useMemo(
    () =>
      filterModules(
        modules ?? [],
        { ...filters, search: debouncedSearch },
        profile?.id ?? null,
      ),
    [debouncedSearch, filters, modules, profile?.id],
  )

  async function handleDownload(module: ModuleWithRelations) {
    setDownloadingId(module.id)
    try {
      const filename = module.storage_path.split('/').pop() || module.title
      const url = await createModuleSignedUrl(module.storage_path, filename)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast({
        title: t('modulesDownloadErrorTitle'),
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleDelete(module: ModuleWithRelations) {
    try {
      await deleteModule.mutateAsync(module)
      toast({ title: t('modulesDeletedToastTitle'), tone: 'success' })
    } catch (error) {
      toast({
        title: t('modulesDeleteErrorTitle'),
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  async function handleImport() {
    if (!importingModule || !subjectId) return
    try {
      await importModule.mutateAsync({ moduleId: importingModule.id, subjectId })
      toast({ title: t('modulesImportSuccessTitle'), tone: 'success' })
      setImportingModule(null)
      setSubjectId('')
    } catch (error) {
      toast({
        title: t('modulesImportErrorTitle'),
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  const hasModules = (modules?.length ?? 0) > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('modulesPageTitle')}
        description={t('modulesPageDescription')}
        actions={
          // Hidden while empty — the empty state hosts the upload CTA, so the
          // header button returns only once there are modules.
          hasModules &&
          profile && (
            <ModuleUploadDialog
              ownerId={profile.id}
              trigger={
                <Button>
                  <PlusIcon /> {t('modulesUploadButton')}
                </Button>
              }
            />
          )
        }
      />

      {hasModules && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="sm:max-w-xs sm:flex-1">
            <Input
              type="search"
              placeholder={t('modulesSearchPlaceholder')}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              aria-label={t('modulesSearchAriaLabel')}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={filters.kind}
              onValueChange={(value) =>
                setFilters({ ...filters, kind: value as ModuleKind | 'all' })
              }
            >
              <SelectTrigger aria-label={t('modulesFilterByKindAriaLabel')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('modulesAllKinds')}</SelectItem>
                {MODULE_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {MODULE_KIND_META[kind].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant={filters.mineOnly ? 'primary' : 'outline'}
            onClick={() => setFilters({ ...filters, mineOnly: !filters.mineOnly })}
            aria-pressed={filters.mineOnly}
          >
            {t('modulesMineOnly')}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
        </div>
      ) : !hasModules ? (
        <EmptyState
          icon={<ModuleIcon />}
          title={t('modulesEmptyStateTitle')}
          description={t('modulesEmptyStateDescription')}
          preview={
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="rounded-lg border border-(--color-border) bg-(--color-surface-1) p-5 shadow-(--shadow-card)"
                >
                  <div className="h-5 w-20 rounded-full bg-(--color-accent-500)/20" />
                  <div className="mt-4 h-4 w-3/4 rounded-full bg-(--color-surface-3)" />
                  <div className="mt-2 h-3 w-full rounded-full bg-(--color-surface-2)" />
                  <div className="mt-2 h-3 w-2/3 rounded-full bg-(--color-surface-2)" />
                  <div className="mt-6 flex items-center justify-between">
                    <div className="h-3 w-16 rounded-full bg-(--color-surface-2)" />
                    <div className="h-8 w-24 rounded-md bg-(--color-surface-2)" />
                  </div>
                </div>
              ))}
            </div>
          }
          action={
            profile && (
              <ModuleUploadDialog
                ownerId={profile.id}
                trigger={
                  <Button>
                    <PlusIcon /> {t('modulesUploadButton')}
                  </Button>
                }
              />
            )
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<ModuleIcon />}
          title={t('modulesNoMatchesTitle')}
          description={t('modulesNoMatchesDescription')}
        />
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visible.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              canManage={isAdmin || module.owner_id === profile?.id}
              onDownload={handleDownload}
              onDelete={handleDelete}
              downloading={downloadingId === module.id}
              onImport={(item) => setImportingModule(item)}
            />
          ))}
        </motion.div>
      )}
      <ResponsiveDrawer
        open={!!importingModule}
        onOpenChange={(open) => !open && setImportingModule(null)}
      >
        <ResponsiveDrawerContent className="md:w-[min(34rem,calc(100%-3rem))]">
          <ResponsiveDrawerHeader
            title={t('modulesImportDialogTitle')}
            description={t('modulesImportDialogDescription')}
          />
          <ResponsiveDrawerBody>
            <div className="space-y-2">
              <label htmlFor="import-subject" className="text-sm font-medium">
                {t('modulesCourseSubjectLabel')}
              </label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger
                  id="import-subject"
                  aria-label={t('modulesCourseSubjectLabel')}
                >
                  <SelectValue placeholder={t('modulesChooseCourseSubjectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {(subjects ?? []).map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </ResponsiveDrawerBody>
          <ResponsiveDrawerFooter
            primaryLabel={t('modulesImportMaterialButton')}
            primaryDisabled={!subjectId}
            primaryLoading={importModule.isPending}
            onPrimary={() => void handleImport()}
            onSecondary={() => setImportingModule(null)}
          />
        </ResponsiveDrawerContent>
      </ResponsiveDrawer>
    </div>
  )
}
