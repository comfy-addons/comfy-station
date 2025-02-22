import { Collection, Entity, ManyToMany, ManyToOne, OneToMany, PrimaryKey, Property } from '@mikro-orm/core'
import { v4 } from 'uuid'
import { EAttachmentStatus, EStorageType, EValueType } from './enum'
import type { WorkflowTask } from './workflow_task'
import type { WorkflowTaskEvent } from './workflow_task_event'
import type { Workflow } from './workflow'
import type { User } from './user'
import type { Resource } from './client_resource'
import { BackendENV } from '@/env'
import { createHash } from 'crypto'
import { AttachmentTag } from './attachment_tag'

@Entity()
export class Attachment {
  @PrimaryKey({ type: 'string' })
  id = v4()

  @Property({ type: 'string' })
  fileName: string

  @Property({ type: 'bigint' })
  size: number // In bytes

  @Property({ type: 'float', nullable: true })
  ratio?: number //  width / height, only for image

  @Property({ type: 'varchar', default: EValueType.Image, nullable: true })
  type?: EValueType.Image | EValueType.Video | EValueType.File

  @Property({ type: 'varchar', default: EAttachmentStatus.PENDING, index: true })
  status!: EAttachmentStatus

  @Property({ type: 'varchar', default: EStorageType.LOCAL })
  storageType!: EStorageType

  @ManyToOne('WorkflowTaskEvent', { nullable: true, deleteRule: 'set null' })
  taskEvent?: WorkflowTaskEvent

  @ManyToOne('WorkflowTask', { nullable: true, deleteRule: 'set null' })
  task?: WorkflowTask

  @ManyToOne('Workflow', { index: true, nullable: true, deleteRule: 'set null' })
  workflow?: Workflow

  @OneToMany({ entity: 'User', mappedBy: 'avatar', nullable: true })
  users = new Collection<User>(this)

  @OneToMany({ entity: 'Resource', mappedBy: 'image', nullable: true })
  resources? = new Collection<Resource>(this)

  @ManyToMany('User', 'favorites', { index: true })
  likers = new Collection<User>(this)

  @ManyToMany('AttachmentTag', 'attachments', { index: true })
  tags = new Collection<AttachmentTag>(this)

  @Property({ type: 'timestamp' })
  createdAt = new Date()

  @Property({ type: 'timestamp', onUpdate: () => new Date() })
  updateAt = new Date()

  constructor(fileName: string, size: number) {
    this.fileName = fileName
    this.size = size
    this.storageType = BackendENV.S3_ENDPOINT ? EStorageType.S3 : EStorageType.LOCAL
  }

  static fileMD5(buffer: ArrayBuffer | Buffer) {
    return new Promise<string>((resolve, reject) => {
      try {
        const hash = createHash('md5')
        const data = new Uint8Array(buffer)
        hash.update(data)
        const md5 = hash.digest('hex')
        resolve(md5)
      } catch (e) {
        reject(e)
      }
    })
  }
}
