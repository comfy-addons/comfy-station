import { EUserRole } from '@/entities/enum'
import { User } from '@/entities/user'
import { MikroORMInstance } from '@services/mikro-orm.service'
import { defineCommand } from 'citty'
import consola from 'consola'

export default defineCommand({
  meta: {
    name: 'user',
    description: 'Create or update current user'
  },
  args: {
    email: {
      type: 'string',
      description: 'email of user',
      required: false,
      alias: 'e'
    },
    password: {
      type: 'string',
      description: 'password of user, specify to update',
      required: false,
      alias: 'p'
    },
    roleLevel: {
      type: 'string',
      description: 'role level of user, max is 5 (Admin), 4 (Editor), 3 (User), specify to update',
      required: false,
      alias: 'l',
      valueHint: 'From 1 -> 5'
    },
    weight: {
      type: 'string',
      description: 'weight of user for job priority, specify to update',
      required: false,
      alias: 'w'
    }
  },
  async run({ args }) {
    const db = await MikroORMInstance.getInstance().getEM()

    if (!args.email) {
      const users = await db.find(User, {})
      consola.info('List of available users:')
      users.forEach((user) => {
        consola.info(`- ${user.email} - Level: ${user.role} - Weight: ${user.weightOffset}`)
      })
      process.exit(0)
    }

    const role = Number(args.roleLevel || EUserRole.User) as EUserRole
    const user = await db.findOne(User, { email: args.email }, { populate: ['password'] })
    if (!user) {
      if (!args.password) {
        consola.error('Password is required')
        return
      }
      const newUser = new User(args.email, args.password)
      newUser.role = role
      newUser.weightOffset = Number(args.weight || 1)
      await db.persistAndFlush(newUser)
      consola.success(`User ${newUser.email} created with role level ${newUser.role}`)
    } else {
      let updated = false
      if (args.password) {
        user.password = User.hashPassword(args.password)
        updated = true
      }
      if (args.roleLevel) {
        user.role = role
        updated = true
      }
      if (args.weight) {
        user.weightOffset = Number(args.weight)
        updated = true
      }
      if (updated) {
        await db.flush()
        consola.success('User updated')
      } else {
        consola.success(`User ${user.email} already exists with role level ${user.role}`)
      }
    }
    process.exit(0)
  }
})
