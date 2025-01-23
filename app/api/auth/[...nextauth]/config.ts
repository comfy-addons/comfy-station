import jwt from 'jsonwebtoken'
import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { User } from '@/entities/user'
import { BackendENV } from '@/env'
import { getBaseUrl } from '@/utils/trpc'

const getUserInformationByCredentials = async (email: string, password: string): Promise<User | false> => {
  return fetch(`${getBaseUrl()}/api/user/credential`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BackendENV.INTERNAL_SECRET}`
    }
  })
    .then((res) => {
      if (!res.ok) {
        return false
      }
      return res.json()
    })
    .catch((e) => {
      console.log(e)
      return false
    })
}

const getUserInformationByEmail = async (email: string): Promise<User | false> => {
  return fetch(`${getBaseUrl()}/api/user/email`, {
    method: 'POST',
    body: JSON.stringify({ email }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BackendENV.INTERNAL_SECRET}`
    }
  })
    .then((res) => {
      if (!res.ok) {
        return false
      }
      return res.json()
    })
    .catch((e) => {
      return false
    })
}

export const NextAuthOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (credentials) {
          const user = await getUserInformationByCredentials(credentials.email, credentials.password)
          if (user) {
            return { id: user.id, email: user.email }
          }
        }
        return null
      }
    })
  ],
  secret: BackendENV.NEXTAUTH_SECRET ?? 'secret',
  callbacks: {
    async session({ session, token }) {
      if (token.email) {
        const user = await getUserInformationByEmail(token.email)
        if (user) {
          session.user = user
          session.accessToken = {
            token: jwt.sign({ email: user.email, isWs: false }, BackendENV.NEXTAUTH_SECRET),
            wsToken: jwt.sign({ email: user.email, isWs: true }, BackendENV.NEXTAUTH_SECRET)
          }
        } else {
          throw new Error('User not found')
        }
      }
      return session
    }
  }
}
