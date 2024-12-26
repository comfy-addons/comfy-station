import './globals.scss'

import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

import { BackgroundSVG } from '@/components/svg/BackgroundSVG'
import { SessionLayout } from './layout.session'
import { ClientLayout } from './layout.client'
import { BackendENV } from '@/env'
import TRPCLayout from './layout.trpc'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
}

export const metadata: Metadata = {
  title: 'Home | ComfyUI-Station',
  description: 'A station for all your comfyui instance'
}

async function getBackendURL() {
  'use server'
  return BackendENV.BACKEND_URL
}

export default async function RootLayout(
  props: Readonly<{
    children: React.ReactNode
    params: { locale: string; session: any }
  }>
) {
  const params = await props.params

  const { session, locale } = params

  const { children } = props

  const messages = await getMessages()
  const backendURL = await getBackendURL()

  return (
    <html lang={locale} data-backend-url={backendURL}>
      <body>
        <SessionLayout session={session}>
          <NextIntlClientProvider timeZone='UTC' messages={messages}>
            <BackgroundSVG
              preserveAspectRatio='none'
              className='-z-10 absolute top-0 left-0 w-full h-full object-fill'
            />
            <TRPCLayout>
              <div className='w-full h-full md:p-2 lg:p-4 flex justify-center items-center relative overflow-x-hidden'>
                <ClientLayout>{children}</ClientLayout>
              </div>
            </TRPCLayout>
          </NextIntlClientProvider>
        </SessionLayout>
        <div id='portal-me' className='fixed z-10 top-0 left-0 w-screen h-screen pointer-events-none transition-all' />
      </body>
    </html>
  )
}
