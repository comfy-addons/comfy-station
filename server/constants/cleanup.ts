export const MONITOR_EVENT_CLEANUP_DAYS = 7 // Default to 7 days retention

export const CLEANUP_CONFIG = {
  MONITOR_EVENTS_RETENTION_DAYS: 7,
  CRON_SCHEDULE: '0 0 * * *' // Run at midnight every day
} as const
