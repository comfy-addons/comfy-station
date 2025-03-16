import swagger from '@elysiajs/swagger'
import { Logger } from '@saintno/needed-tools'
import Elysia from 'elysia'
import { UserPlugin } from './handlers/user'
import { AttachmentPlugin } from './handlers/attachment'
import { TaskPlugin } from './handlers/task'
import { TokenPlugin } from './handlers/token'
import { WorkflowPlugin } from './handlers/workflow'
import { CleanUpJobPlugin } from './plugins/cleanup-jobs.plugin'
import { EnsureLogPlugin } from './plugins/ensure-log-plugin'
import { SystemPlugin } from './handlers/system'
import { EnsureCorsPlugin } from './plugins/ensure-cors-plugin'

export const ElysiaHandler = new Elysia()
  .use(EnsureLogPlugin)
  .decorate(() => {
    return {
      start: performance.now()
    }
  })
  .onAfterResponse(({ log, start, request }) => {
    log.i(request.method, request.url, {
      time: Math.round((performance.now() - start) / 1000) + 'ms'
    })
  })
  // Bind cleanup service
  .use(CleanUpJobPlugin)
  // Bind Swagger to Elysia
  .use(
    swagger({
      documentation: {
        info: {
          title: 'API Document | ComfyUI-Station',
          version: '1.0.0'
        },
        tags: [
          { name: 'Others', description: 'Other app api' },
          { name: 'Workflow', description: 'Workflow apis' },
          { name: 'Task', description: 'Task apis' },
          { name: 'Attachment', description: 'Attachment apis' }
        ],
        components: {
          securitySchemes: {
            // Support bearer token
            BearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          }
        }
      }
    })
  )
  // User authentication
  .use(UserPlugin)
  // Bind Internal Path
  .use(
    new Elysia({ prefix: '/api/ext' })
      .get(
        '/health',
        () => {
          return {
            status: 'ok'
          }
        },
        {
          detail: {
            tags: ['Others']
          }
        }
      )
      .guard(
        {
          detail: { security: [{ BearerAuth: [] }] }
        },
        (app) =>
          app
            // Ensure CORS
            .use(EnsureCorsPlugin)
            // Token Plugin
            .use(TokenPlugin)
            // Bind Workflow Plugin
            .use(WorkflowPlugin)
            // Task Plugin
            .use(TaskPlugin)
            // Attachment plugin
            .use(AttachmentPlugin)
            // System Plugin
            .use(SystemPlugin)
      )
  )
