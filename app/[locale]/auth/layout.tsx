'use client'
import { Card } from '@/components/ui/card'

import AuthBackground from '@/assets/auth-background.jpg'
import Image from 'next/image'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SimpleTransitionLayout } from '@/components/SimpleTranslation'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@routing'
import PackageInfo from '@/package.json'
import { useEffect } from 'react'
import { trpc } from '@/utils/trpc'
import { useSystemDarkMode } from '@/hooks/useDarkmode'
import { useAppStore } from '@/states/app'
import { Button } from '@/components/ui/button'
import { SunMoon, Moon, Sun } from 'lucide-react'

const Layout: IComponent = ({ children }) => {
  const route = useRouter()
  const t = useTranslations()
  const pathName = usePathname()
  const isDark = useSystemDarkMode()
  const { setTheme, theme } = useAppStore()
  const currentTab = pathName.includes('token') ? 'token' : pathName.includes('init') ? 'init' : 'account'

  const { data: isEmptyUser } = trpc.user.isEmpty.useQuery()

  const toggleTheme = () => {
    if (theme === 'system') {
      isDark ? setTheme('light') : setTheme('dark')
    } else if (theme === 'dark') {
      isDark ? setTheme('system') : setTheme('light')
    } else {
      isDark ? setTheme('dark') : setTheme('system')
    }
  }

  useEffect(() => {
    document.title = 'Login | ComfyUI-Station'
  }, [])

  useEffect(() => {
    if (isEmptyUser) {
      route.push('/auth/init')
    }
  }, [isEmptyUser, route])

  return (
    <Card className='bg-background flex flex-col md:flex-row overflow-hidden relative w-full border-none md:w-fit h-fit rounded-none md:rounded-xl'>
      <Image alt='Login background' className='object-cover w-full md:w-[400px]' height={400} src={AuthBackground} />
      <div className='flex justify-start flex-col p-8 w-full md:w-[460px] gap-4'>
        {!isEmptyUser && (
          <Tabs value={currentTab}>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger onClick={() => route.push('/auth/basic')} value='account'>
                {t('auth.tabs.Account')}
              </TabsTrigger>
              <TabsTrigger onClick={() => route.push('/auth/token')} value='token'>
                {t('auth.tabs.Token')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        <div className='flex flex-col'>
          <h1 className='text-xl font-semibold text-foreground'>{t('app.name')}</h1>
          <p className='text-sm font-normal text-muted-foreground'>{t('app.description')}</p>
        </div>
        <SimpleTransitionLayout deps={[currentTab]} className='w-full flex flex-col gap-4 min-h-[264px]'>
          {children}
        </SimpleTransitionLayout>
      </div>
      <div className='absolute bottom-1 right-2 text-sm font-normal text-secondary-foreground opacity-50'>
        {t('app.version')} {PackageInfo.version}
      </div>
      <div className='fixed top-4 right-4'>
        <Button
          title={`Toggle theme - ${theme}`}
          onClick={toggleTheme}
          size='icon'
          variant='secondary'
          className='rounded-full shadow-lg border'
        >
          {theme === 'system' && <SunMoon size={16} />}
          {theme === 'dark' && <Moon size={16} />}
          {theme === 'light' && <Sun size={16} />}
        </Button>
      </div>
    </Card>
  )
}

export default Layout
