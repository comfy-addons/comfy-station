/**
 * Auth error cause types for tRPC error handling
 */
export interface AuthErrorCause {
  /** Specific error code for authentication failures */
  code: 'TOKEN_EXPIRED' | 'INVALID_TOKEN' | 'AUTH_FAILED'
  /** HTTP status code */
  status: number
}

/**
 * Extended TRPCError type that includes auth error cause
 */
export type TRPCAuthError = {
  cause?: AuthErrorCause
}