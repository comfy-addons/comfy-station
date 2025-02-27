import { BackendENV } from '@/env'
import { User } from '@/entities/user'
import { JWTPayload } from '@/types/jwt'
import { sign, verify, TokenExpiredError as JWTTokenExpiredError } from 'jsonwebtoken'

export const TOKEN_EXPIRATION = '24h'

export class TokenExpiredError extends Error {
  constructor(message = 'Token has expired') {
    super(message)
    this.name = 'TokenExpiredError'
  }
}

export class JWTService {
  private static instance: JWTService
  
  private constructor() {}

  public static getInstance(): JWTService {
    if (!JWTService.instance) {
      JWTService.instance = new JWTService()
    }
    return JWTService.instance
  }

  /**
   * Generate JWT token with user information
   */
  public generateToken(user: User, isWs: boolean = false): string {
    const payload: JWTPayload = {
      id: user.id,
      role: user.role,
      balance: user.balance,
      weightOffset: user.weightOffset,
      createdAt: new Date(user.createdAt).toISOString(),
      updateAt: new Date(user.updateAt).toISOString(),
      isWs
    }

    return sign(payload, BackendENV.NEXTAUTH_SECRET, {
      expiresIn: TOKEN_EXPIRATION
    })
  }

  /**
   * Verify and decode JWT token
   */
  public verifyToken(token: string): JWTPayload {
    try {
      const decoded = verify(token, BackendENV.NEXTAUTH_SECRET) as JWTPayload
      
      // Check if token is expired
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        throw new TokenExpiredError()
      }
      
      return decoded
      
    } catch (error) {
      if (error instanceof JWTTokenExpiredError || error instanceof TokenExpiredError) {
        throw new TokenExpiredError()
      }
      
      throw new Error('Invalid or malformed token')
    }
  }
}