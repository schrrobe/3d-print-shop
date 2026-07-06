// The @analytics provider plugins ship without type declarations.
declare module '@analytics/google-analytics' {
  import type { AnalyticsPlugin } from 'analytics'
  export default function googleAnalytics(config: {
    measurementIds: string[]
    gtagConfig?: Record<string, unknown>
    enabled?: boolean
  }): AnalyticsPlugin
}

declare module '@analytics/google-tag-manager' {
  import type { AnalyticsPlugin } from 'analytics'
  export default function googleTagManager(config: {
    containerId: string
    dataLayerName?: string
    enabled?: boolean
  }): AnalyticsPlugin
}
