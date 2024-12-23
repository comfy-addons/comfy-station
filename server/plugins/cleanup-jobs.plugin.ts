import { CleanupService } from '../../services/cleanup.service'
import { CLEANUP_CONFIG } from '../../config/constants'
import { cron } from '@elysiajs/cron'
import Elysia from 'elysia'

export const CleanUpJobPlugin = new Elysia().use(
  cron({
    name: 'cleanup',
    pattern: CLEANUP_CONFIG.CRON_SCHEDULE,
    run: CleanupService.getInstance().handleCleanupClientEvents
  })
)
