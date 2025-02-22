import { Collection, Entity, PrimaryKey, Property, ManyToMany, ManyToOne } from '@mikro-orm/core'
import { v4 } from 'uuid'
import { Attachment } from './attachment'
import { User } from './user'

@Entity()
export class AttachmentTag {
  @PrimaryKey({ type: 'string' })
  id = v4()

  @Property({ type: 'string', unique: true })
  name: string

  @Property({ type: 'timestamp' })
  createdAt = new Date()

  @Property({ type: 'string', nullable: true })
  color?: string

  @ManyToMany('Attachment', 'tags', { owner: true })
  attachments = new Collection<Attachment>(this)

  @ManyToOne('User', { index: true, deleteRule: 'cascade' })
  owner: User

  constructor(name: string, owner: User) {
    this.name = name
    this.owner = owner
  }
}
