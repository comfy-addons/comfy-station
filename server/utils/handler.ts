import { IncomingMessage, ServerResponse } from 'http'

type HTTPHandler = (req: IncomingMessage, res: ServerResponse) => void

/**
 * Type-safe helper to create a prefixed HTTP handler
 * @param prefix - The URL prefix (e.g., '/api/trpc')
 * @param handler - The HTTP handler for requests matching the prefix
 * @returns A new HTTP handler that applies the prefix
 */
export const createPrefixedHandler = (prefix: string, handler: HTTPHandler): HTTPHandler => {
  return (req, res) => {
    if (req.url?.startsWith(prefix)) {
      req.url = req.url.slice(prefix.length) || '/'
      return handler(req, res)
    }
    // If the prefix doesn't match, return a 404 or handle as needed
    res.statusCode = 404
    res.end('Not Found')
  }
}
