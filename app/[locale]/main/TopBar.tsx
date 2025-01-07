import { AddUserDialog } from '@/components/dialogs/AddUserDialog'
import { AddWorkflowDialog } from '@/components/dialogs/AddWorkflowDialog'
import { SimpleTransitionLayout } from '@/components/SimpleTranslation'
import { Button } from '@/components/ui/button'
import { UserInformation } from '@/components/UserInformation'
import { WorkflowApiSnippet } from '@/components/WorkflowApiSnippet'
import { EUserRole } from '@/entities/enum'
import { useCurrentRoute } from '@/hooks/useCurrentRoute'
import { useSystemDarkMode } from '@/hooks/useDarkmode'
import { dispatchGlobalEvent, EGlobalEvent } from '@/hooks/useGlobalEvent'
import { useAppStore } from '@/states/app'
import { Moon, Plus, SearchIcon, Sun, SunMoon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useMemo } from 'react'

export const TopBar: IComponent = () => {
  const { data: session } = useSession()
  const isDark = useSystemDarkMode()
  const { setTheme, theme } = useAppStore()
  const { routeConf, router } = useCurrentRoute()

  const Icon = routeConf?.SubIcon

  const role = session?.user.role || EUserRole.User

  const toggleTheme = () => {
    if (theme === 'system') {
      isDark ? setTheme('light') : setTheme('dark')
    } else if (theme === 'dark') {
      isDark ? setTheme('system') : setTheme('light')
    } else {
      isDark ? setTheme('dark') : setTheme('system')
    }
  }

  const renderToolBox = useMemo(() => {
    switch (routeConf?.key) {
      case 'home':
        return (
          <>
            <Button size='icon' variant='secondary' className='rounded-full'>
              <SearchIcon size={16} />
            </Button>
            {role > EUserRole.User && <AddWorkflowDialog />}
          </>
        )
      case 'execute': {
        return (
          <>
            <WorkflowApiSnippet />
            <Button size='icon' variant='secondary' className='rounded-full'>
              <SearchIcon size={16} />
            </Button>
          </>
        )
      }
      case 'settingUsers':
        return (
          <>
            <Button size='icon' variant='secondary' className='rounded-full'>
              <SearchIcon size={16} />
            </Button>
            {role === EUserRole.Admin && <AddUserDialog />}
          </>
        )
      case 'settingTokens':
        return (
          <>
            <Button
              onClick={() => dispatchGlobalEvent(EGlobalEvent.BTN_CREATE_TOKEN)}
              size='icon'
              variant='default'
              className='rounded-full'
              title='Create new token'
            >
              <Plus size={16} />
            </Button>
          </>
        )
    }
  }, [role, routeConf?.key])

  return (
    <div className='w-full min-h-fit py-2 px-3 flex items-center'>
      <SimpleTransitionLayout deps={[routeConf?.group ?? '']} className='w-full flex items-center'>
        {!!Icon && (
          <Button
            disabled={!routeConf?.backUrl}
            onClick={() => {
              if (routeConf?.backUrl) router.push(routeConf.backUrl)
            }}
            variant='ghost'
            size='icon'
            className='mr-2'
          >
            <Icon width={16} height={16} />
          </Button>
        )}
        <h1 className='text-sm md:text-xl font-black uppercase'>{routeConf?.title}</h1>
      </SimpleTransitionLayout>
      <div className='flex-auto items-center justify-end flex gap-2'>
        {renderToolBox}
        <Button
          title={`Toggle theme - ${theme}`}
          onClick={toggleTheme}
          size='icon'
          variant='secondary'
          className='rounded-full'
        >
          {theme === 'system' && <SunMoon size={16} />}
          {theme === 'dark' && <Moon size={16} />}
          {theme === 'light' && <Sun size={16} />}
        </Button>
      </div>
      {role < EUserRole.Admin && (
        <div>
          <UserInformation />
        </div>
      )}
    </div>
  )
}
