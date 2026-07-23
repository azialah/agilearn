import Bugsnag from '@bugsnag/js'
import BugsnagPluginReact from '@bugsnag/plugin-react'
import BugsnagPerformance from '@bugsnag/browser-performance'
import React, { type ReactNode } from 'react'

const apiKey = import.meta.env.VITE_BUGSNAG_API_KEY

if (apiKey) {
  Bugsnag.start({ apiKey, plugins: [new BugsnagPluginReact()] })
  BugsnagPerformance.start({ apiKey })
} else {
  console.warn('VITE_BUGSNAG_API_KEY is missing — error reporting is disabled.')
}

const reactPlugin = apiKey ? Bugsnag.getPlugin('react') : undefined

/** Bugsnag's error boundary when configured; a plain passthrough otherwise. */
export const ErrorBoundary = reactPlugin
  ? reactPlugin.createErrorBoundary(React)
  : function PassthroughBoundary({ children }: { children: ReactNode }) {
      return <>{children}</>
    }
