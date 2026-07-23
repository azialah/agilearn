import { Package } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { SettingsScreenHeader } from '../SettingsScreenHeader'

export function AboutSection() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsScreenHeader
        title="About"
        description="Version and product information."
      />

      <Card className="rounded-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="size-4 text-(--color-accent-350)" /> About Agilearn
          </CardTitle>
          <p className="text-sm text-(--color-ink-muted)">
            A calm teacher workspace for semesters, classroom cohorts, course subjects,
            rosters, grades, attendance, and private teaching materials.
          </p>
        </CardHeader>
        <CardBody className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-(--color-ink-muted)">
            Version 1.0 · Progressive Web App
          </span>
          <span className="text-(--color-ink-faint)">© 2026 Agilearn</span>
        </CardBody>
      </Card>
    </div>
  )
}
