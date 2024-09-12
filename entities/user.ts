import { Cascade, Collection, Entity, ManyToOne, OneToMany, OneToOne, PrimaryKey, Property } from '@mikro-orm/core'
import { v4 } from 'uuid'
import { createHmac } from 'crypto'
import { EUserRole } from './enum'

import type { Workflow } from './workflow'
import type { Token } from './token'
import type { WorkflowEditEvent } from './workflow_edit_event'
import type { TokenShared } from './token_shared'
import type { Job } from './job'
import type { UserNotification } from './user_notifications'
import type { Attachment } from './attachment'
import type { Trigger } from './trigger'

export interface IMaper {
  key: string
  target: string
  description: string
}

@Entity()
export class User {
  @PrimaryKey({ type: 'string' })
  id = v4()

  @Property({ type: 'string', unique: true })
  email: string

  @Property({ type: 'string', lazy: true })
  password: string

  @ManyToOne({ entity: 'Attachment', inversedBy: 'users', nullable: true })
  avatar?: Attachment

  @Property({ type: 'int', default: EUserRole.User, index: true })
  role!: EUserRole

  @Property({ type: 'float', default: -1 })
  balance!: number

  @Property({ type: 'float', default: 0 })
  weightOffset!: number

  @Property({ type: 'timestamp' })
  createdAt = new Date()

  @Property({ type: 'timestamp', onUpdate: () => new Date() })
  updateAt = new Date()

  @OneToMany({
    entity: 'Workflow',
    mappedBy: 'author',
    cascade: [Cascade.REMOVE],
    orphanRemoval: true
  })
  workflows = new Collection<Workflow>(this)

  @OneToMany({
    entity: 'Token',
    mappedBy: 'createdBy',
    cascade: [Cascade.REMOVE],
    orphanRemoval: true
  })
  tokens = new Collection<Token>(this)

  @OneToMany({
    entity: 'TokenShared',
    mappedBy: 'user',
    cascade: [Cascade.REMOVE],
    orphanRemoval: true
  })
  sharedTokens = new Collection<TokenShared>(this)

  @OneToMany({
    entity: 'WorkflowEditEvent',
    mappedBy: 'user',
    cascade: [Cascade.REMOVE],
    orphanRemoval: true
  })
  editWorkflowActions = new Collection<WorkflowEditEvent>(this)

  @OneToMany({
    entity: 'Job',
    mappedBy: 'owner',
    cascade: [Cascade.REMOVE],
    orphanRemoval: true
  })
  jobs = new Collection<Job>(this)

  @OneToMany({
    entity: 'UserNotification',
    mappedBy: 'user',
    cascade: [Cascade.REMOVE],
    orphanRemoval: true
  })
  notifications = new Collection<UserNotification>(this)

  @OneToMany({
    entity: 'Trigger',
    mappedBy: 'user',
    cascade: [Cascade.REMOVE]
  })
  triggers = new Collection<Trigger>(this)

  constructor(email: string, password: string) {
    this.email = email
    this.password = User.hashPassword(password)
  }

  static hashPassword(password: string): string {
    return createHmac('sha256', password).digest('hex')
  }
}
