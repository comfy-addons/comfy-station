import { Logger } from '@saintno/needed-tools'
import Elysia from 'elysia'

const logger = new Logger('Elysia')

export const EnsureLogPlugin = new Elysia().derive({ as: 'scoped' }, async () => {
  return {
    log: logger
  }
})
