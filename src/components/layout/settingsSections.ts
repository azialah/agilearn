import type { ComponentType } from 'react'
import { Info, ShieldCheck, SlidersHorizontal, UserRound } from 'lucide-react'

export interface SettingsSection {
  label: string
  /** Route path (each section is its own screen). */
  to: string
  description: string
  icon: ComponentType<{ className?: string }>
}

/** Settings sections, shared by the desktop settings sidebar and the mobile
 *  iOS-style master list. Each entry is its own route/screen. */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    label: 'Profile',
    to: '/settings/profile',
    description: 'Account, avatar, and password',
    icon: UserRound,
  },
  {
    label: 'Workspace',
    to: '/settings/workspace',
    description: 'Appearance, language, notifications',
    icon: SlidersHorizontal,
  },
  {
    label: 'Privacy',
    to: '/settings/privacy',
    description: 'Data, exports, and this device',
    icon: ShieldCheck,
  },
  {
    label: 'About',
    to: '/settings/about',
    description: 'Version and product information',
    icon: Info,
  },
]
