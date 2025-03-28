import { Entity, PrimaryKey, Property, ManyToOne, Enum, Index } from '@mikro-orm/core'
import { User } from './user' // Assuming you have a User entity
import { EDeviceType, EDeviceStatus } from './enum'

@Entity()
export class UserClient {
  @PrimaryKey({ type: 'bigint' })
  id!: number

  @ManyToOne('User', { deleteRule: 'cascade' })
  user!: User

  @Property({ type: 'string', nullable: true })
  @Index()
  endpoint?: string // Web Push endpoint

  @Property({ type: 'varchar', nullable: true })
  publicKey?: string // Public key for push encryption

  @Property({ type: 'varchar', nullable: true })
  authKey?: string // Auth key for push encryption

  @Enum(() => EDeviceType)
  deviceType!: EDeviceType // e.g., PC, Phone, Tablet

  @Enum(() => EDeviceStatus)
  deviceStatus!: EDeviceStatus // Online, Idle, Offline

  @Property({ type: 'timestamp' })
  lastActiveAt!: Date // Last time the device was active

  @Property({ type: 'varchar', nullable: true })
  ipAddress?: string // Optional: Store IP address for device identification

  @Property({ type: 'varchar', nullable: true })
  userAgent?: string // Optional: Store the user-agent string for additional device info

  @Property({ type: 'boolean', default: true })
  isActive!: boolean // To deactivate old/invalid subscriptions

  @Property({ type: 'timestamp' })
  createdAt = new Date()

  @Property({ type: 'timestamp', onUpdate: () => new Date() })
  updatedAt = new Date()
}
