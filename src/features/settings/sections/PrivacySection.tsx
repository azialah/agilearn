import { BookOpenCheck, ShieldCheck, Smartphone } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { SettingsScreenHeader } from '../SettingsScreenHeader'
import { SettingHint } from '../shared'

export function PrivacySection() {
  const installed =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsScreenHeader
        title="Privacy"
        description="What Agilearn stores, exports, and keeps on this device."
      />

      <Card className="rounded-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenCheck className="size-4 text-(--color-accent-350)" /> Teaching
            workspace
          </CardTitle>
          <p className="text-sm text-(--color-ink-muted)">
            Set the defaults you return to when organizing a new course.
          </p>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SettingHint
            title="Class setup"
            detail="Choose an academic year, term, and editable template when creating a class."
          />
          <SettingHint
            title="Grades"
            detail="Use your own breakdowns; templates are starting points, not locked policy."
          />
          <SettingHint
            title="Course materials"
            detail="Keep syllabi, lesson plans, activities, and resources together with light tags."
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-(--color-accent-350)" /> Privacy and
            exports
          </CardTitle>
          <p className="text-sm text-(--color-ink-muted)">
            Grade reports are prepared one learner at a time, so a teacher stays in
            control of what leaves the workspace.
          </p>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-(--color-ink-muted)">
            Student and guardian contacts are optional. Agilearn opens your own mail app
            only after you preview a report; it does not send grades in the background.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="size-4 text-(--color-accent-350)" /> PWA and this
            device
          </CardTitle>
          <p className="text-sm text-(--color-ink-muted)">
            Agilearn keeps an offline application shell and checks for service-worker
            updates on supported browsers.
          </p>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SettingHint
            title="Install status"
            detail={
              installed
                ? 'Agilearn is running as an installed app.'
                : 'Use your browser install action to add Agilearn to this device.'
            }
          />
          <SettingHint
            title="Offline behavior"
            detail="Previously opened application screens can start offline; live teaching records still synchronize through Supabase."
          />
        </CardBody>
      </Card>
    </div>
  )
}
