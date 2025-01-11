import { ClientMonitorEvent } from '../entities/client_monitor_event'
import { ClientStatusEvent } from '../entities/client_status_event'
import { CLEANUP_CONFIG } from '../config/constants'
import { MikroORMInstance } from './mikro-orm.service'
import { Logger } from '@saintno/needed-tools'

export class CleanupService {
  static instance: CleanupService
  private logger = new Logger('CleanupService')
  private orm = MikroORMInstance.getInstance()
  private constructor() {}

  static getInstance() {
    if (!CleanupService.instance) {
      CleanupService.instance = new CleanupService()
    }
    return CleanupService.instance
  }

  public handleCleanupClientEvents = async () => {
    try {
      const result = await this.cleanupOldEvents()
      this.logger.i('handleCleanupClientEvents', 'Cleanup completed:', result)
    } catch (error) {
      this.logger.w('handleCleanupClientEvents', 'Cleanup job failed:', error)
    }
  }

  async cleanupOldEvents(retentionDays = CLEANUP_CONFIG.MONITOR_EVENTS_RETENTION_DAYS) {
    const em = await this.orm.getEM()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    try {
      // Clean up monitor events
      const monitorResult = await em.nativeDelete(ClientMonitorEvent, {
        createdAt: { $lt: cutoffDate }
      })

      // Clean up status events
      const statusResult = await em.nativeDelete(ClientStatusEvent, {
        createdAt: { $lt: cutoffDate }
      })

      return {
        monitorEvents: monitorResult,
        statusEvents: statusResult
      }
    } catch (error) {
      this.logger.w('cleanupOldEvents', 'Failed to cleanup events:', error)
      throw error
    }
  }
}
