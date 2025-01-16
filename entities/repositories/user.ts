import { EntityRepository } from '@mikro-orm/core'
import type { User } from '../user'
import { ENotificationType } from '../enum'
import { INotificationData, UserNotification } from '../user_notifications'
import CachingService from '@services/caching.service'

export class UserRepository extends EntityRepository<User> {
  public async makeNotify(
    user: User,
    conf: {
      title: string
      priority?: number
      description?: string
      type?: ENotificationType
      target?: INotificationData
    }
  ) {
    const notification = this.em.create(
      UserNotification,
      {
        title: conf.title,
        priority: conf.priority ?? 1,
        description: conf.description,
        type: conf.type ?? ENotificationType.Info,
        target: conf.target,
        user
      },
      { partial: true }
    )
    user.notifications.add(notification)
    await Promise.all([
      this.em.persistAndFlush(notification),
      CachingService.getInstance().set('USER_NOTIFICATION', user.id, Date.now())
    ])
    return notification
  }
}
