import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { ExitIcon } from '@radix-ui/react-icons'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'
import { signOut, useSession } from 'next-auth/react'
import { trpc } from '@/utils/trpc'
import { EDeviceStatus, EUserRole } from '@/entities/enum'
import { cn } from '@/utils/style'
import { useState } from 'react'
import { MiniBadge } from './MiniBadge'
import { UserNotificationCenter } from './UserNotificationCenter'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@routing'
import { Languages } from 'lucide-react'

export const UserInformation: IComponent = () => {
  const tLang = useTranslations('lang')
  const t = useTranslations('components.userInformation')
  const locale = useLocale()
  const session = useSession()
  const [balance, setBalance] = useState(session.data?.user.balance || -1)
  const shortUsername = (session.data?.user?.email || '?').split('@')[0].slice(0, 2).toUpperCase()
  const { data: avatarInfo } = trpc.attachment.get.useQuery({ id: session.data?.user?.avatar?.id || '' })

  const updateStatus = trpc.userClient.updateStatus.useMutation()

  trpc.watch.balance.useSubscription(undefined, {
    onData: (data) => {
      setBalance(data)
    }
  })

  const handlePressLogout = async () => {
    try {
      await updateStatus.mutateAsync({ status: EDeviceStatus.OFFLINE })
    } catch (e) {
      console.error(e)
    }
    signOut({
      callbackUrl: '/',
      redirect: true
    })
  }

  const notAdmin = session.data?.user?.role !== EUserRole.Admin
  const email = session.data?.user?.email
  const shortEmail = email?.split('@')[0]

  const router = useRouter()
  const pathname = usePathname()

  // Get list of supported locales
  const locales = ['en', 'vi', 'zh']

  return (
    <div className='w-full flex gap-2 items-center px-2'>
      <DropdownMenu>
        <DropdownMenuTrigger className='hidden md:flex items-center order-1'>
          <Avatar className='order-1'>
            <AvatarImage src={avatarInfo?.raw?.url || undefined} alt={session.data?.user?.email || '@user'} />
            <AvatarFallback>{shortUsername}</AvatarFallback>
          </Avatar>
          <div
            className={cn('flex flex-col text-start', {
              'order-0': notAdmin,
              'order-2': !notAdmin
            })}
          >
            <span className={cn('px-2 hidden md:block')}>{session.data?.user?.email}</span>
            <span className={cn('px-2 md:hidden block')}>@{shortEmail}</span>
            <div className='w-full text-xs px-2 text-foreground/50 hidden md:flex items-center gap-2'>
              <span>
                {balance === -1 ? t('unlimited') : balance.toFixed(2)} {t('credits')}
              </span>
              <MiniBadge
                title={EUserRole[session.data!.user.role]}
                className={cn('w-min', {
                  'bg-green-500 text-white border-none': session.data!.user.role === EUserRole.Admin,
                  'bg-blue-500 text-white border-none': session.data!.user.role === EUserRole.Editor,
                  'bg-black text-white border-none': session.data!.user.role === EUserRole.User
                })}
              />
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' sideOffset={10}>
          {/* Language options */}
          {locales.map((rLocale) => (
            <DropdownMenuItem
              key={rLocale}
              onClick={() => router.replace(pathname, { locale: rLocale })}
              className='min-w-[100px] flex justify-between cursor-pointer'
            >
              {tLang(rLocale as any)}
              <Languages
                size={16}
                className={cn({
                  'opacity-100': locale === rLocale,
                  'opacity-20': locale !== rLocale
                })}
              />
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            onClick={handlePressLogout}
            className='min-w-[100px] flex justify-between cursor-pointer border-t mt-1'
          >
            <span>{t('logout')}</span>
            <ExitIcon className='ml-2' width={16} height={16} />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <UserNotificationCenter isAdmin={!notAdmin} />
    </div>
  )
}
