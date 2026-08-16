import { Bell, ClipboardCheck, Command, Languages, SunMoon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useToast } from '@/components/ui/toast'
import { useLocale, type AppLocale } from '@/lib/locale'
import { isMac } from '@/lib/platform'
import { useUpdateProfilePreferences } from '@/lib/queries/profiles'
import { SettingsScreenHeader } from '../SettingsScreenHeader'
import { getErrorMessage, useNotificationPermission } from '../shared'

export function WorkspaceSection() {
  const { locale, setLocale, t } = useLocale()
  const preferences = useUpdateProfilePreferences()
  const { toast } = useToast()
  const notifications = useNotificationPermission()

  async function handleLocaleChange(nextLocale: AppLocale) {
    setLocale(nextLocale)
    try {
      await preferences.mutateAsync({ preferredLocale: nextLocale })
      toast({ title: t('saved') })
    } catch (error) {
      setLocale(locale)
      toast({ title: 'Could not save language', description: getErrorMessage(error) })
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsScreenHeader
        title="Workspace"
        description="Appearance, language, and how Agilearn behaves on this device."
      />

      <Card className="rounded-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SunMoon className="size-4 text-(--color-accent-350)" /> Appearance
          </CardTitle>
          <p className="text-sm text-(--color-ink-muted)">
            Choose how Agilearn looks on this device.
          </p>
        </CardHeader>
        <CardBody>
          <p className="text-sm font-medium">Theme</p>
          <div className="mt-2">
            <ThemeToggle />
          </div>
          <p className="mt-3 text-xs leading-5 text-(--color-ink-faint)">
            Warm Light keeps the familiar cream workspace. Calm White is a clearer
            paper-white option; Dark and System remain available.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="size-4 text-(--color-accent-350)" />{' '}
            {t('displayLanguage')}
          </CardTitle>
          <p className="text-sm text-(--color-ink-muted)">{t('languageDescription')}</p>
        </CardHeader>
        <CardBody>
          <label
            className="block max-w-sm text-sm font-medium"
            htmlFor="preferred-locale"
          >
            {t('displayLanguage')}
          </label>
          <select
            id="preferred-locale"
            aria-label={t('displayLanguage')}
            value={locale}
            onChange={(event) => void handleLocaleChange(event.target.value as AppLocale)}
            disabled={preferences.isPending}
            className="mt-2 h-9 w-full max-w-sm rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm text-(--color-ink) focus-visible:border-(--color-accent-400) focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="en">{t('english')}</option>
            <option value="tl">{t('tagalog')}</option>
          </select>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4 text-(--color-accent-350)" /> Notifications
          </CardTitle>
          <p className="text-sm text-(--color-ink-muted)">
            Turn on optional browser alerts while Agilearn is open. Your reliable
            low-grade and attendance alerts always stay in the in-app notification bell.
          </p>
        </CardHeader>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              {!notifications.supported
                ? 'Not supported on this browser'
                : notifications.permission === 'granted'
                  ? 'Notifications are on'
                  : notifications.permission === 'denied'
                    ? 'Notifications are blocked'
                    : 'Notifications are off'}
            </p>
            <p className="text-sm text-(--color-ink-muted)">
              {notifications.permission === 'denied'
                ? 'Blocked in your browser settings — allow them for this site to turn back on.'
                : "We'll ask your browser for permission first."}
            </p>
          </div>
          {notifications.supported && notifications.permission === 'default' && (
            <Button variant="outline" onClick={() => void notifications.request()}>
              <Bell className="size-4" /> Enable notifications
            </Button>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-4 text-(--color-accent-350)" /> Attendance
            import
          </CardTitle>
          <p className="text-sm text-(--color-ink-muted)">
            Agilearn imports Google Meet attendance from a{' '}
            <a
              href="https://trackit.visualbrahma.tech/"
              target="_blank"
              rel="noreferrer"
              className="text-(--color-accent-350) underline underline-offset-2"
            >
              TrackIt
            </a>{' '}
            participants .txt export. Supported browsers: Chromium-based browsers (Chrome,
            Edge, Brave) and Mozilla Firefox. Install the extension, run it during your
            Meet session, then upload the exported file from the{' '}
            <span className="font-medium text-(--color-ink)">Import from Meet</span>{' '}
            button on any class session's attendance page.
          </p>
        </CardHeader>
      </Card>

      <Card>
        <CardBody className="flex items-center gap-2 text-sm text-(--color-ink-muted)">
          <Command className="size-4 shrink-0 text-(--color-accent-350)" aria-hidden />
          Press{' '}
          <kbd className="rounded border border-(--color-border) px-1.5 py-0.5 text-xs text-(--color-ink)">
            {isMac ? '⌘' : 'Ctrl'}
          </kbd>{' '}
          +{' '}
          <kbd className="rounded border border-(--color-border) px-1.5 py-0.5 text-xs text-(--color-ink)">
            K
          </kbd>{' '}
          anywhere in the app to jump to a page.
        </CardBody>
      </Card>
    </div>
  )
}
