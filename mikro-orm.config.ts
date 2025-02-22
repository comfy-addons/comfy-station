import { defineConfig } from '@mikro-orm/libsql'
import { Client } from './entities/client'
import { ClientStatusEvent } from './entities/client_status_event'
import { ClientMonitorEvent } from './entities/client_monitor_event'
import { ClientMonitorGpu } from './entities/client_monitor_gpu'
import { TokenPermission } from './entities/token_permission'
import { Token } from './entities/token'
import { User } from './entities/user'
import { WorkflowEditEvent } from './entities/workflow_edit_event'
import { Workflow } from './entities/workflow'
import { WorkflowTask } from './entities/workflow_task'
import { WorkflowTaskEvent } from './entities/workflow_task_event'
import { Extension } from './entities/client_extension'
import { ClientActionEvent } from './entities/client_action_event'
import { Job } from './entities/job'
import { JobItem } from './entities/job_item'
import { TokenShared } from './entities/token_shared'
import { Resource } from './entities/client_resource'
import { UserNotification } from './entities/user_notifications'
import { Attachment } from './entities/attachment'
import { Trigger } from './entities/trigger'
import { Tag } from './entities/tag'
import { UserClient } from './entities/user_clients'
import { AttachmentTag } from './entities/attachment_tag'

export default defineConfig({
  entities: [
    Trigger,
    ClientActionEvent,
    ClientMonitorGpu,
    ClientMonitorEvent,
    ClientStatusEvent,
    Client,
    Extension,
    Resource,
    Tag,
    Job,
    JobItem,
    User,
    UserNotification,
    UserClient,
    Token,
    TokenShared,
    TokenPermission,
    Workflow,
    WorkflowTask,
    WorkflowTaskEvent,
    WorkflowEditEvent,
    Attachment,
    AttachmentTag
  ],
  dbName: process.cwd() + '/storage/comfyui.manager.db',
  debug: process.env.NODE_ENV === 'development',
  discovery: { disableDynamicFileAccess: false }
})
