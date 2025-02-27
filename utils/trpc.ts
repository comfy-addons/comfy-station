import superjson from 'superjson'

import {
  createWSClient,
  httpBatchLink,
  httpLink,
  isNonJsonSerializable,
  splitLink,
  unstable_httpBatchStreamLink,
  TRPCClientError,
  wsLink,
  retryLink
} from '@trpc/client'
import { createTRPCNext } from '@trpc/next'
import { ssrPrepass } from '@trpc/next/ssrPrepass'
import { signOut } from 'next-auth/react'
import type { AppRouter } from '@/server/routers/_app'
import { BackendENV } from '@/env'

let AuthToken = ''
let wsAuthToken = ''

export function setAuthToken(newToken: string, wsToken: string) {
  return new Promise<boolean>((resolve, rj) => {
    /**
     * You can also save the token to cookies, and initialize from
     * cookies above.
     */
    AuthToken = newToken
    if (!wsAuthToken && wsToken) {
      wsAuthToken = wsToken
      let checkThreshold = 0
      if (wsClient.connection?.state === 'open') {
        wsClient.close()
      }
      wsClient.reconnect(null)
      const checkConnection = setInterval(() => {
        if (checkThreshold === 100) {
          // Around 20 seconds
          clearInterval(checkConnection)
          rj('Connection timeout')
        }
        if (wsClient.connection?.state === 'open') {
          clearInterval(checkConnection)
          resolve(true)
        }
        checkThreshold++
      }, 200)
    } else {
      resolve(!!wsAuthToken && wsClient.connection?.state === 'open')
    }
  })
}

export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Get html tag
    const html = document.querySelector('html')
    const isSameDomain = html?.getAttribute('data-backend-same-domain') === 'true'
    if (isSameDomain) {
      return window.location.origin
    } else {
      return html?.getAttribute('data-backend-url') ?? BackendENV.BACKEND_URL
    }
  }
  return BackendENV.BACKEND_URL_INTERNAL
}

function getBaseWsUrl() {
  const BackendURL = getBaseUrl()
  if (BackendURL.includes('https')) {
    return BackendURL.replace('https', 'wss')
  }
  return BackendURL.replace('http', 'ws')
}

const wsClient = createWSClient({
  url: () => `${getBaseWsUrl()}/ws?auth=${encodeURIComponent(wsAuthToken)}`
})

// Custom event for token expiration
const TOKEN_EXPIRED_EVENT = 'token:expired'
export const emitTokenExpired = () => {
  if (typeof window !== 'undefined') {
    // Emit token expired event
    window.dispatchEvent(new CustomEvent(TOKEN_EXPIRED_EVENT))
    // Clear auth tokens
    AuthToken = ''
    wsAuthToken = ''
    if (wsClient.connection?.state === 'open') {
      wsClient.close()
    }
    // Redirect to login page using NextAuth
    signOut({ callbackUrl: '/auth/basic' })
  }
}

// Error handler for tRPC
const errorHandler = (error: unknown, attempts = 1) => {
  // Check if it's a tRPC error
  if (error instanceof TRPCClientError) {
    const cause = error.data
    // Handle token expiration
    if (cause?.code === 'TOKEN_EXPIRED' || error.message === 'Token has expired') {
      emitTokenExpired()
      return false // Don't retry on token expiration
    }
  }
  return attempts <= 3 // Retry other errors
}

const trpc = createTRPCNext<AppRouter>({
  transformer: superjson,
  config(opts) {
    const { ctx } = opts
    if (typeof window !== 'undefined') {
      // during client requests
      return {
        links: [
          retryLink({
            retry(opts) {
              return errorHandler(opts.error, opts.attempts)
            }
          }),
          splitLink({
            condition: (op) => op.type === 'subscription',
            true: wsLink({
              client: wsClient,
              transformer: superjson
            }),
            /**
             * Add support for file uploads
             */
            false: splitLink({
              condition: (op) => isNonJsonSerializable(op.input),
              true: httpLink({
                url: getBaseUrl() + '/api/trpc',
                transformer: {
                  serialize: (data) => data as FormData,
                  deserialize: superjson.deserialize
                },
                async headers() {
                  return {
                    authorization: `Bearer ${AuthToken}`
                  }
                }
              }),
              false: splitLink({
                condition(op) {
                  // check for context property `skipBatch`
                  return op.context.skipBatch === true
                },
                true: httpLink({
                  url: getBaseUrl() + '/api/trpc',
                  transformer: superjson,
                  async headers() {
                    return {
                      authorization: `Bearer ${AuthToken}`
                    }
                  }
                }),
                false: unstable_httpBatchStreamLink({
                  url: getBaseUrl() + '/api/trpc',
                  transformer: superjson,
                  async headers() {
                    return {
                      authorization: `Bearer ${AuthToken}`
                    }
                  }
                })
              })
            })
          })
        ]
      }
    }
    return {
      headers() {
        return {
          cookie: ctx?.req?.headers.cookie
        }
      },
      links: [
        httpBatchLink({
          /**
           * If you want to use SSR, you need to use the server's full URL
           * @link https://trpc.io/docs/v11/ssr
           **/
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          // You can pass any HTTP headers you wish here
          async headers() {
            if (!ctx?.req?.headers) {
              return {}
            }
            // To use SSR properly, you need to forward client headers to the server
            // This is so you can pass through things like cookies when we're server-side rendering
            return {
              cookie: ctx.req.headers.cookie
            }
          }
        })
      ]
    }
  },
  /**
   * @link https://trpc.io/docs/v11/ssr
   **/
  ssr: true,
  ssrPrepass
})

export { wsClient, trpc, TOKEN_EXPIRED_EVENT }
