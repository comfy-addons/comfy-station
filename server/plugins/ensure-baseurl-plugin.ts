import Elysia from 'elysia'

export const EnsureBaseURL = new Elysia().resolve({ as: 'scoped' }, async ({ request }) => {
  const fullUrl = new URL(request.url)
  // Get the protocol and host
  const baseUrl = `${fullUrl.protocol}//${fullUrl.host}`
  return { baseUrl }
})
