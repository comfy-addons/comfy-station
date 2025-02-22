import { router } from '../trpc'
import { attachmentRouter } from './attachment'
import { clientRouter } from './client'
import { extensionRouter } from './extension'
import { resourceRouter } from './resource'
import { tagRouter } from './tag'
import { taskRouter } from './task'
import { tokenRouter } from './token'
import { userRouter } from './user'
import { userNotificationRouter } from './user_notification'
import { watchRouter } from './watch'
import { workflowRouter } from './workflow'
import { snippetRouter } from './snippet'
import { workflowTaskRouter } from './workflow_task'
import { generativeRouter } from './generative'
import { userClientRouter } from './user_client'
import { attachmentTagRouter } from './attachment_tag'

export const appRouter = router({
  task: taskRouter,
  client: clientRouter,
  attachment: attachmentRouter,
  attachmentTag: attachmentTagRouter,
  resource: resourceRouter,
  tag: tagRouter,
  extension: extensionRouter,
  workflow: workflowRouter,
  snippet: snippetRouter,
  workflowTask: workflowTaskRouter,
  watch: watchRouter,
  token: tokenRouter,
  user: userRouter,
  userClient: userClientRouter,
  notification: userNotificationRouter,
  generative: generativeRouter
})

// Export only the type of a router!
// This prevents us from importing server code on the client.
export type AppRouter = typeof appRouter
