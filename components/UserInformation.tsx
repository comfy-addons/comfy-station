import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { ExitIcon } from '@radix-ui/react-icons'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'
import { signOut, useSession } from 'next-auth/react'
import { trpc } from '@/utils/trpc'
import { EDeviceStatus, EUserRole } from '@/entities/enum'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { MiniBadge } from './MiniBadge'
import { UserNotificationCenter } from './UserNotificationCenter'

export const UserInformation: IComponent = () => {
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

  return (
    <div className='w-full flex gap-2 items-center px-2'>
      <DropdownMenu>
        <DropdownMenuTrigger className='flex items-center order-1'>
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
              <span>{balance === -1 ? 'Unlimited' : balance.toFixed(2)} credits</span>
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
          <DropdownMenuItem onClick={handlePressLogout} className='min-w-[100px] flex justify-between cursor-pointer'>
            <span>Logout</span>
            <ExitIcon className='ml-2' width={16} height={16} />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <UserNotificationCenter isAdmin={!notAdmin} />
    </div>
  )
}
