import { Entity, ManyToOne, PrimaryKey, PrimaryKeyProp, Property } from '@mikro-orm/core'
import type { ClientMonitorEvent } from './client_monitor_event'

@Entity()
export class ClientMonitorGpu {
  @ManyToOne('ClientMonitorEvent', { inversedBy: 'gpus', deleteRule: 'cascade' })
  monitorEvent: ClientMonitorEvent

  @PrimaryKey({ type: 'bigint' })
  id!: number

  @Property({ type: 'int' })
  gpuIdx: number

  @Property({ name: 'utlization', type: 'float', nullable: true })
  utilization?: number

  @Property({ type: 'float', nullable: true })
  temperature?: number

  @Property({ type: 'double' })
  memoryUsage: number

  @Property({ type: 'double' })
  memoryTotal: number

  @Property({ type: 'timestamp' })
  createdAt = new Date();

  [PrimaryKeyProp]?: ['monitorEvent', 'gpuIdx'] // this is needed for proper type checks in `FilterQuery`

  constructor(event: ClientMonitorEvent, gpuId: number, memoryUsage: number, memoryTotal: number) {
    this.gpuIdx = gpuId
    this.memoryUsage = memoryUsage
    this.memoryTotal = memoryTotal
    this.monitorEvent = event
  }
}
