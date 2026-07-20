import { create } from 'zustand'

export type OnboardingStep =
  'credentials' | 'verify' | 'name' | 'school' | 'level' | 'welcome'

interface OnboardingState {
  step: OnboardingStep
  /** Carried from the credentials step so verify/resend can reuse it. */
  email: string
  setStep: (step: OnboardingStep) => void
  setEmail: (email: string) => void
  reset: () => void
}

/** Cross-screen state for the signup wizard. */
export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: 'credentials',
  email: '',
  setStep: (step) => set({ step }),
  setEmail: (email) => set({ email }),
  reset: () => set({ step: 'credentials', email: '' }),
}))
