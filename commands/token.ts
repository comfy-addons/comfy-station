import { EUserRole } from '@/entities/enum'
import { Token } from '@/entities/token'
import { TokenPermission } from '@/entities/token_permission'
import { User } from '@/entities/user'
import { Workflow } from '@/entities/workflow'
import { MikroORMInstance } from '@services/mikro-orm.service'
import { defineCommand } from 'citty'
import consola from 'consola'

export default defineCommand({
  meta: {
    name: 'token',
    description: 'Create or update current token'
  },
  args: {
    email: {
      type: 'string',
      description: 'email of user',
      required: false,
      alias: 'e'
    },
    tokenId: {
      type: 'string',
      description: 'token ID',
      required: false,
      alias: 't'
    },
    workflowId: {
      type: 'string',
      description: 'workflow ID',
      required: true,
      alias: 'w'
    }
  },
  async run({ args }) {
    const db = await MikroORMInstance.getInstance().getEM()
    if (!args.email) {
      const tokens = await db.find(Token, {})
      consola.info('List of available tokens:')
      tokens.forEach((token) => {
        consola.info(`- ${token.id}`)
      })
      process.exit(0)
    }

    const user = await db.findOne(User, { email: args.email })
    if (!user) {
      consola.error('User not found')
      process.exit(1)
    }
    if (!args.workflowId) {
      consola.error('Workflow ID is required')
      process.exit(1)
    }
    const workflow = await db.findOneOrFail(Workflow, { id: args.workflowId })
    if (!args.tokenId) {
      const token = db.create(
        Token,
        {
          createdBy: user,
          isMaster: false,
          isWorkflowDefault: false,
          balance: -1,
          weightOffset: 0
        },
        { partial: true }
      )
      const grantedWorkflow = db.create(TokenPermission, { workflow, token }, { partial: true })
      token.grantedWorkflows.add(grantedWorkflow)
      await db.persistAndFlush(token)
    } else {
      const token = await db.findOneOrFail(Token, { id: args.tokenId })
      const grantedWorkflow = db.create(TokenPermission, { workflow, token }, { partial: true })
      token.grantedWorkflows.add(grantedWorkflow)
      await db.flush()
    }
    process.exit(0)
  }
})
