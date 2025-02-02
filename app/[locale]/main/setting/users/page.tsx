'use client'
import { AttachmentReview } from '@/components/AttachmentReview'
import { MiniBadge } from '@/components/MiniBadge'
import { LoadingSVG } from '@/components/svg/LoadingSVG'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EDeviceStatus, EUserRole } from '@/entities/enum'
import { EGlobalEvent, useGlobalEvent } from '@/hooks/useGlobalEvent'
import { trpc } from '@/utils/trpc'
import { DollarSign, Dumbbell, Play, Settings2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '@/utils/style'
import { UserUpdater } from './UserUpdater'
import { useTranslations } from 'next-intl'

export default function SettingUserPage() {
  const t = useTranslations('settings.users')
  const users = trpc.user.list.useQuery()
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  useGlobalEvent(EGlobalEvent.RLOAD_USER_LIST, () => users.refetch())

  const sortedUsers = useMemo(() => {
    if (!users.data) return []
    return [...users.data].sort((a, b) => b.user.role - a.user.role)
  }, [users.data])

  if (users.isLoading) {
    return <LoadingSVG className='w-6 h-6 m-auto' />
  }

  return (
    <div className='w-full h-full space-y-4 overflow-auto pb-10'>
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <UserUpdater
              user={sortedUsers.find((u) => u.user.id === selectedUser)!.user}
              onRefresh={() => {
                users.refetch()
                setSelectedUser(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('table.user')}</TableHead>
            <TableHead>{t('table.role')}</TableHead>
            <TableHead>{t('table.balance')}</TableHead>
            <TableHead>{t('table.priority')}</TableHead>
            <TableHead>{t('table.executed')}</TableHead>
            <TableHead className='w-[100px]'>{t('table.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedUsers.map(({ user, runCount, status }) => {
            const shortName = user.email.split('@')[0].slice(0, 2).toUpperCase()

            return (
              <TableRow key={user.id}>
                <TableCell>
                  <div className='flex items-center gap-2'>
                    <div className='relative'>
                      <AttachmentReview
                        mode='avatar'
                        shortName={shortName}
                        data={user.avatar}
                        className='rounded w-8 h-8'
                      />
                      <div
                        className={cn('w-3 h-3 absolute -bottom-1 -right-1 rounded-full border-background border-2', {
                          'bg-green-500': status === EDeviceStatus.ONLINE,
                          'bg-blue-400': status === EDeviceStatus.IDLE,
                          'bg-zinc-700': status === EDeviceStatus.OFFLINE
                        })}
                      />
                    </div>
                    <div className='flex flex-col'>
                      <span className='font-medium'>{user.email}</span>
                      <span className='text-xs text-muted-foreground'>
                        {t('id', { id: user.id.split('-').pop() })}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <MiniBadge
                    title={EUserRole[user.role]}
                    className={cn('w-min', {
                      'bg-green-500 text-white border-none': user.role === EUserRole.Admin,
                      'bg-blue-500 text-white border-none': user.role === EUserRole.Editor,
                      'bg-black text-white border': user.role === EUserRole.User
                    })}
                  />
                </TableCell>
                <TableCell>
                  <MiniBadge
                    Icon={DollarSign}
                    count={user.balance === -1 ? t('status.unlimited') : user.balance.toFixed(2)}
                    className='px-0 w-min border-none shadow-none whitespace-nowrap'
                  />
                </TableCell>
                <TableCell>
                  <MiniBadge Icon={Dumbbell} count={user.weightOffset} className='px-0 w-min border-none shadow-none' />
                </TableCell>
                <TableCell>
                  <MiniBadge Icon={Play} count={`${runCount}`} className='px-0 w-min border-none shadow-none' />
                </TableCell>
                <TableCell>
                  <Button variant='ghost' size='icon' onClick={() => setSelectedUser(user.id)}>
                    <Settings2 className='w-4 h-4' />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
