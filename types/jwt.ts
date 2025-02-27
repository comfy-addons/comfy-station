import { EUserRole } from '@/entities/enum'

export interface JWTPayload {
  id: string
  role: EUserRole
  balance: number
  weightOffset: number
  createdAt: string
  updateAt: string
  isWs?: boolean
  exp?: number
  iat?: number
}

export interface JWTContext {
  id: string
  role: EUserRole
  balance: number
  weightOffset: number
  createdAt: Date
  updateAt: Date
}