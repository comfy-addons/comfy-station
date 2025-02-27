import { Logger } from '@saintno/needed-tools'
import CachingService from './caching'
import { MikroORMInstance } from './mikro-orm'
import { WorkflowTask } from '@/entities/workflow_task'
import { User } from '@/entities/user'
import { UserNotification } from '@/entities/user_notifications'
import { EDeviceStatus, EDeviceType, ENotificationTarget, ETaskStatus } from '@/entities/enum'
import { createContext } from '@/server/context'
import { UserClient } from '@/entities/user_clients'
import { UAParser } from 'ua-parser-js'

const USER_OFFLINE_THRESHOLD = 5 * 60 * 1000 // 5 minutes

// TODO: Handle notification using this service
export class UserManagement {
  private static instance: UserManagement
  private caching: CachingService
  private orm: MikroORMInstance
  private logger: Logger

  private constructor() {
    this.logger = new Logger('NotificationManagement')
    this.caching = CachingService.getInstance()
    this.orm = MikroORMInstance.getInstance()

    // Pre-check user status
    this.handleUserOffline()
    // Start watching user status
    this.watchUserStatus()
  }

  public static getInstance(): UserManagement {
    if (!UserManagement.instance) {
      UserManagement.instance = new UserManagement()
    }
    return UserManagement.instance
  }

  public handleUserEvent = async (ctx: Awaited<ReturnType<typeof createContext>>) => {
    try {
      const {
        session: { user },
        em,
        extra: { userAgent, userIp }
      } = ctx
      if (!user) return

      let deviceType = EDeviceType.PC
      if (userAgent) {
        const parser = new UAParser(userAgent)
        const device = parser.getDevice()
        switch (device.type) {
          case 'mobile':
            deviceType = EDeviceType.PHONE
            break
          case 'tablet':
            deviceType = EDeviceType.TABLET
            break
          case 'console':
          case 'smarttv':
          case 'wearable':
          case 'xr':
          case 'embedded':
            deviceType = EDeviceType.OTHER
            break
          default:
            deviceType = EDeviceType.PC
            break
        }
      }

      const client = await em.findOne(UserClient, { user: { id: user.id }, userAgent })
      if (client) {
        client.lastActiveAt = new Date()
        client.ipAddress = userIp ?? undefined
        client.deviceType = deviceType
      } else {
        const client = em.create(
          UserClient,
          {
            user: user.id,
            userAgent,
            ipAddress: userIp,
            deviceType,
            lastActiveAt: new Date(),
            deviceStatus: EDeviceStatus.ONLINE
          },
          { partial: true }
        )
        em.persist(client)
      }
      await em.flush()
    } catch (e) {
      this.logger.w('handleUserEvent', 'Error when handle user event', e)
    }
  }

  public watchUserStatus = async () => {
    setInterval(this.handleUserOffline, 60 * 1000) // Check every minute
  }

  private handleUserOffline = async () => {
    const em = await this.orm.getEM()
    const clients = await em.find(UserClient, {
      deviceStatus: { $ne: EDeviceStatus.OFFLINE },
      lastActiveAt: { $lt: new Date(Date.now() - USER_OFFLINE_THRESHOLD) }
    })
    for (const client of clients) {
      client.deviceStatus = EDeviceStatus.OFFLINE
    }
    await em.flush()
  }

  public handleTaskStatus = async (task: WorkflowTask, user?: User) => {
    if (!user) return
    const em = await this.orm.getEM()
    const isSub = !!task.parent
    const userRes = em.getRepository(User)
    const isParent = task.status === ETaskStatus.Parent
    const notiTask = isSub ? task.parent : task

    if (!notiTask) return
    const noti = await em.findOne(UserNotification, { user, target: { targetId: notiTask.id } })

    if (noti) {
      if (isParent) {
      } else {
        if (noti.target) noti.target.value = 100
      }
    } else {
      await userRes.makeNotify(user, {
        title: 'Task pending',
        target: {
          targetId: notiTask.id,
          targetType: ENotificationTarget.WorkflowTask,
          value: 0
        }
      })
    }
  }
}
