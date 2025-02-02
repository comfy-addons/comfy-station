'use client'

import { redirect } from '@routing'
import { useLocale } from 'next-intl'

/**
 * Current redirect to /auth/basic
 */
export default function Home() {
  const locale = useLocale()
  redirect({
    href: {
      pathname: '/auth/basic'
    },
    locale
  })
}
