'use client'

import { LoadableButton } from '@/components/LoadableButton'
import { TooltipPopup } from '@/components/TooltipPopup'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table'
import { getBaseUrl, trpc } from '@/utils/trpc'
import { Pencil, RefreshCcwDot, Trash2 } from 'lucide-react'
import { TokenPopup } from './TokenPopup'
import { usePathname, useRouter } from 'next/navigation'
import { dispatchGlobalEvent, EGlobalEvent } from '@/hooks/useGlobalEvent'
import useCopyAction from '@/hooks/useCopyAction'
import { useTranslations } from 'next-intl'

export default function TokenPage() {
  const t = useTranslations('settings.tokens')
  const router = useRouter()
  const pathName = usePathname()
  const tokens = trpc.token.list.useQuery()

  const { copyToClipboard } = useCopyAction()
  const reRoller = trpc.token.reroll.useMutation()
  const destroyer = trpc.token.destroy.useMutation()

  return (
    <div className='w-full h-full flex flex-col'>
      <TokenPopup
        onRefresh={() => {
          tokens.refetch()
        }}
      />
      <div className='p-2'>
        <h1 className='font-bold text-xl'>{t('title')}</h1>
        <p className='text-gray-500'>{t('description.main')}</p>
        <p className='text-gray-500'>
          {t('description.docs')}{' '}
          <a href={`${getBaseUrl()}/swagger`} target='__blank' className='text-blue-500 underline px-1'>
            {t('description.apiDocs')}
          </a>
          .
        </p>
      </div>
      <div className='flex-1 relative border-t'>
        <Table divClassname='absolute top-0 left-0 w-full h-full pb-10'>
          <TableHeader>
            <TableRow className='whitespace-nowrap'>
              <TableHead>{t('table.tokenKey')}</TableHead>
              <TableHead>{t('table.description')}</TableHead>
              <TableHead>{t('table.type')}</TableHead>
              <TableHead>{t('table.balance')}</TableHead>
              <TableHead>{t('table.workflows')}</TableHead>
              <TableHead>{t('table.weightOffset')}</TableHead>
              <TableHead>{t('table.createdBy')}</TableHead>
              <TableHead>{t('table.status')}</TableHead>
              <TableHead>{t('table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.data?.map((token) => (
              <TableRow key={token.id}>
                <TableCell
                  className='cursor-pointer'
                  onDoubleClick={() => copyToClipboard(token.id, t('actions.copied'))}
                  title={t('actions.copyId')}
                >
                  {token.id.slice(-8)}...
                </TableCell>
                <TableCell>{token.description ?? '-'}</TableCell>
                <TableCell>{token.type}</TableCell>
                <TableCell>
                  {token.balance === -1
                    ? token.createdBy.balance === -1
                      ? t('status.unlimited')
                      : t('status.synced', { amount: token.createdBy.balance.toFixed(2) })
                    : token.balance.toFixed(2)}
                </TableCell>
                <TableCell>
                  <TooltipPopup
                    containerCls='mt-auto min-h-[200px]'
                    tooltipContent={
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('workflows.title')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {token.isMaster && (
                            <TableCell className='text-center' colSpan={1}>
                              {t('workflows.allAllowed')}
                            </TableCell>
                          )}
                          {!token.isMaster &&
                            !!token.grantedWorkflows &&
                            token.grantedWorkflows?.map((workflow) => (
                              <TableRow key={workflow.workflow.id}>
                                <TableCell>{workflow.workflow.name}</TableCell>
                              </TableRow>
                            ))}
                          {!token.grantedWorkflows.length && !token.isMaster && (
                            <TableRow>
                              <TableCell className='text-center' colSpan={1}>
                                {t('workflows.noAllowed')}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    }
                  >
                    {token.isMaster ? 'All' : (token.grantedWorkflows?.length ?? 'Empty')}
                  </TooltipPopup>
                </TableCell>
                <TableCell>{token.weightOffset}</TableCell>
                <TableCell>{token.createdBy.email}</TableCell>
                <TableCell>
                  {token.expireAt && new Date(token.expireAt) < new Date() ? (
                    <span className='text-red-500'>{t('status.expired')}</span>
                  ) : (
                    <span className='text-green-500'>{t('status.active')}</span>
                  )}
                </TableCell>
                <TableCell className='flex gap-2'>
                  <Button
                    size='icon'
                    variant='outline'
                    onClick={async (event) => {
                      copyToClipboard(token.id, t('actions.copied'))
                      const button = event.target as HTMLButtonElement
                      button.textContent = '✓'
                      setTimeout(() => {
                        button.textContent = '📋'
                      }, 1000)
                    }}
                    className='p-1 hover:bg-gray-100 text-green-500 rounded'
                    title={t('actions.copyId')}
                  >
                    📋
                  </Button>
                  <LoadableButton
                    loading={reRoller.isPending}
                    onClick={() => reRoller.mutateAsync({ tokenId: token.id }).then(() => tokens.refetch())}
                    size='icon'
                    variant='outline'
                    title={t('actions.reroll')}
                  >
                    <RefreshCcwDot size={14} />
                  </LoadableButton>
                  <Button
                    size='icon'
                    variant='outline'
                    onClick={() => {
                      router.push(`${pathName}?token_id=${token.id}`)
                      dispatchGlobalEvent(EGlobalEvent.BTN_CREATE_TOKEN)
                    }}
                    className='p-1 hover:bg-gray-100 rounded'
                    title={t('actions.edit')}
                  >
                    <Pencil size={14} />
                  </Button>
                  <LoadableButton
                    loading={destroyer.isPending}
                    onClick={() => destroyer.mutateAsync({ tokenId: token.id }).then(() => tokens.refetch())}
                    size='icon'
                    variant='destructive'
                    title={t('actions.delete')}
                  >
                    <Trash2 size={14} />
                  </LoadableButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
