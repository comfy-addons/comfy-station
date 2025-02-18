import { Cascade, Collection, Entity, ManyToOne, OneToMany, PrimaryKey, Property } from '@mikro-orm/core'
import { v4 } from 'uuid'
import { EValueSelectionType, EValueType, EValueUtilityType, EWorkflowActiveStatus } from './enum'

import type { User } from './user'
import type { WorkflowEditEvent } from './workflow_edit_event'
import type { TokenPermission } from './token_permission'
import type { Attachment } from './attachment'
import type { WorkflowTask } from './workflow_task'

export interface IMapTarget {
  /**
   * KSampler
   */
  nodeName: string
  /**
   * Seed
   */
  keyName: string
  /**
   * 14.inputs.seed
   */
  mapVal: string
}

export interface IMapperBase {
  key: string
  type: EValueType | EValueSelectionType | EValueUtilityType
  iconName?: string
  description?: string
}

export interface IMapperInput extends IMapperBase {
  target: Array<IMapTarget>
  /**
   * Only for type = 'Number'
   */
  min?: number
  /**
   * Only for type = 'Number'
   */
  max?: number
  /**
   * Only for type = 'Number'
   */
  cost?: {
    related: boolean
    /**
     * Workflow cost = old workflow cost + value * costPerUnit
     */
    costPerUnit: number
  }
  /**
   * Only for type = 'Number'
   */
  slider?: {
    /**
     * If true, the input will be a slider
     */
    enable: boolean
    /**
     * Step of the slider
     */
    step?: number
  }
  /**
   * Only for types = Checkpoint | Lora | Sampler | Scheduler
   */
  selections?: Array<{
    id?: string
    value: string
  }>
  generative?: {
    enabled: boolean
    instruction?: string
  }
  /**
   * If true, the input will be hidden on the UI
   */
  hidden?: boolean
  default?: string | number | boolean
}

export interface IMapperOutput extends IMapperBase {
  target: IMapTarget
  /**
   * If true, the output will join all array elements to a string (Only used with type = 'String')
   */
  joinArray?: boolean
}

@Entity()
export class Workflow {
  @PrimaryKey({ type: 'string' })
  id = v4()

  @Property({ type: 'string', nullable: true })
  name?: string

  @Property({ type: 'string', nullable: true })
  description?: string

  @Property({ type: 'string', lazy: true })
  rawWorkflow: string

  @Property({ type: 'boolean', default: false })
  hideWorkflow = false

  @Property({ type: 'boolean', default: false })
  allowLocalhost = false

  @Property({ type: 'json', nullable: true })
  mapInput?: { [key: string]: IMapperInput }

  @Property({ type: 'json', nullable: true })
  mapOutput?: { [key: string]: IMapperOutput }

  @Property({ type: 'float', default: 0 })
  cost!: number // For estimating the cost of running the workflow and calculate new balance of user

  @Property({ type: 'varchar', default: EWorkflowActiveStatus.Activated, index: true })
  status!: EWorkflowActiveStatus

  @Property({ type: 'float', default: 0 })
  baseWeight!: number // Weight of this workflow, more weight means lower priority

  @ManyToOne({ entity: 'User', inversedBy: 'workflows', index: true, deleteRule: 'cascade' })
  author: User

  @ManyToOne({ entity: 'Attachment', nullable: true, lazy: true })
  avatar?: Attachment

  @OneToMany({
    entity: 'WorkflowEditEvent',
    mappedBy: 'workflow',
    cascade: [Cascade.REMOVE],
    orphanRemoval: true
  })
  editedActions = new Collection<WorkflowEditEvent>(this)

  @OneToMany({
    entity: 'TokenPermission',
    mappedBy: 'workflow',
    cascade: [Cascade.REMOVE],
    orphanRemoval: true
  })
  grantedTokens = new Collection<TokenPermission>(this)

  @OneToMany({
    entity: 'Attachment',
    mappedBy: 'workflow',
    cascade: [Cascade.REMOVE]
  })
  attachments = new Set<Attachment>()

  @OneToMany({
    entity: 'WorkflowTask',
    mappedBy: 'workflow',
    cascade: [Cascade.REMOVE],
    orphanRemoval: true
  })
  tasks = new Collection<WorkflowTask>(this)

  @Property({ type: 'timestamp' })
  createdAt = new Date()

  @Property({ type: 'timestamp', onUpdate: () => new Date() })
  updateAt = new Date()

  constructor(author: User, rawWorkflow: string) {
    this.author = author
    this.rawWorkflow = rawWorkflow
  }
}
