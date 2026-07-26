import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useProfile } from '@/lib/queries/profiles'

export type AppLocale = 'en' | 'tl'

const STORAGE_KEY = 'agilearn-locale'

const messages = {
  en: {
    dashboard: 'Home',
    classrooms: 'Classrooms',
    modules: 'Modules',
    calendar: 'Calendar',
    analytics: 'Analytics',
    usage: 'Usage',
    users: 'Users',
    requests: 'Requests',
    schoolOverview: 'School overview',
    auditLog: 'Audit log',
    settings: 'Settings',
    welcomeBack: 'Welcome back, {name}',
    dashboardDescription: "Here's a clear view of your teaching workspace.",
    students: 'Students',
    quickActions: 'Quick actions',
    manageClassrooms: 'Manage classrooms',
    recentClassrooms: 'Recent classrooms',
    viewAll: 'View all',
    noClassrooms: 'No classrooms yet',
    noClassroomsDescription: 'Create your first classroom to get started.',
    goToClassrooms: 'Go to classrooms',
    signOut: 'Sign out',
    profile: 'Profile',
    displayLanguage: 'Display language',
    languageDescription: 'Choose the language used across your workspace.',
    english: 'English',
    tagalog: 'Tagalog',
    saved: 'Saved',
    signIn: 'Sign in',
    signInDescription: 'Welcome back. Sign in to your Agilearn account.',
    authWelcomeTitle: 'Your calm teaching workspace, ready when you are.',
    backToWelcome: 'Back',
    authConsentPrefix: "By continuing, you agree to Agilearn's ",
    termsConditions: 'Terms & Conditions',
    authConsentConjunction: ' and ',
    privacyPolicy: 'Privacy Policy',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    rememberMe: 'Remember me',
    newTeacher: 'New teacher?',
    createAccount: 'Create an account',
    authEyebrow: 'Agilearn for educators',
    authTitle: 'Welcome back to your calm teaching workspace.',
    authBody:
      'Pick up where class left off: weighted grades, live attendance, and the teaching materials your next session needs.',
  },
  tl: {
    dashboard: 'Home',
    classrooms: 'Mga klase',
    modules: 'Mga modyul',
    calendar: 'Kalendaryo',
    analytics: 'Analytics',
    usage: 'Paggamit',
    users: 'Mga user',
    requests: 'Mga kahilingan',
    schoolOverview: 'Pangkalahatang tanaw',
    auditLog: 'Talaan ng pagbabago',
    settings: 'Mga setting',
    welcomeBack: 'Maligayang pagbabalik, {name}',
    dashboardDescription: 'Narito ang malinaw na tanaw sa iyong teaching workspace.',
    students: 'Mga mag-aaral',
    quickActions: 'Mabilisang gawain',
    manageClassrooms: 'Pamahalaan ang mga klase',
    recentClassrooms: 'Mga huling klase',
    viewAll: 'Tingnan lahat',
    noClassrooms: 'Wala pang klase',
    noClassroomsDescription: 'Gumawa ng una mong klase para makapagsimula.',
    goToClassrooms: 'Pumunta sa mga klase',
    signOut: 'Mag-sign out',
    profile: 'Profile',
    displayLanguage: 'Wika ng display',
    languageDescription: 'Piliin ang wikang gagamitin sa iyong workspace.',
    english: 'English',
    tagalog: 'Tagalog',
    saved: 'Nai-save',
    signIn: 'Mag-sign in',
    signInDescription: 'Maligayang pagbabalik. Mag-sign in sa iyong Agilearn account.',
    authWelcomeTitle: 'Handa ang iyong mahinahong teaching workspace kapag handa ka na.',
    backToWelcome: 'Bumalik',
    authConsentPrefix: 'Sa pagpapatuloy, sumasang-ayon ka sa ',
    termsConditions: 'Mga Tuntunin at Kundisyon',
    authConsentConjunction: ' at ',
    privacyPolicy: 'Patakaran sa Privacy ng Agilearn',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Nakalimutan ang password?',
    rememberMe: 'Tandaan ako',
    newTeacher: 'Bagong guro?',
    createAccount: 'Gumawa ng account',
    authEyebrow: 'Agilearn para sa mga guro',
    authTitle: 'Maligayang pagbabalik sa iyong mahinahong teaching workspace.',
    authBody:
      'Ipagpatuloy ang klase: weighted grades, live attendance, at mga materyal para sa susunod mong session.',
  },
} as const

export type MessageKey = keyof (typeof messages)['en']

interface LocaleContextValue {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  t: (key: MessageKey) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function getStoredLocale(): AppLocale {
  if (typeof window === 'undefined') return 'en'
  return window.localStorage.getItem(STORAGE_KEY) === 'tl' ? 'tl' : 'en'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile()
  const [locale, setLocaleState] = useState<AppLocale>(getStoredLocale)

  useEffect(() => {
    const preferredLocale = profile?.preferred_locale
    if (preferredLocale === 'en' || preferredLocale === 'tl') {
      setLocaleState(preferredLocale)
      window.localStorage.setItem(STORAGE_KEY, preferredLocale)
    }
  }, [profile?.preferred_locale])

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale(nextLocale) {
        setLocaleState(nextLocale)
        window.localStorage.setItem(STORAGE_KEY, nextLocale)
      },
      t: (key) => messages[locale][key],
    }),
    [locale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useLocale must be used within a LocaleProvider.')
  return value
}
