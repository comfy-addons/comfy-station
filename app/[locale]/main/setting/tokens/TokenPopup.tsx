import { LoadableButton } from '@/components/LoadableButton'
import { MultiSelect } from '@/components/ui-ext/multi-select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ETokenType, EUserRole } from '@/entities/enum'
import { EGlobalEvent, useGlobalEvent } from '@/hooks/useGlobalEvent'
import { toast } from '@/hooks/useToast'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useTranslations } from 'next-intl'

const TokenSchema = z.object({
  expiredAt: z
    .date({
      coerce: true
    })
    .optional(),
  type: z.nativeEnum(ETokenType),
  balance: z.number({ coerce: true }).optional(),
  description: z.string().optional(),
  weightOffset: z.number({ coerce: true }).optional(),
  workflowIds: z.array(z.string()).optional(),
  isMasterToken: z.boolean().optional().describe('Allow execute all workflow')
})

type TokenInput = z.infer<typeof TokenSchema>

export const TokenPopup: IComponent<{
  onRefresh?: () => void
}> = ({ onRefresh }) => {
  const t = useTranslations('settings.tokenPopup')
  const query = useSearchParams()
  const pathname = usePathname()
  const route = useRouter()
  const tokenId = query.get('token_id')

  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  const form = useForm<TokenInput>({
    resolver: zodResolver(TokenSchema),
    defaultValues: {
      balance: -1,
      description: '',
      type: ETokenType.Both,
      weightOffset: 0,
      isMasterToken: false
    }
  })
  const tokenData = trpc.token.get.useQuery(
    { tokenId: tokenId! },
    {
      enabled: !!tokenId
    }
  )

  const workflows = trpc.workflow.listWorkflowSelections.useQuery()

  const isAdmin = session?.user?.role === EUserRole.Admin
  const isMasterToken = form.watch('isMasterToken')

  const creator = trpc.token.create.useMutation()
  const updater = trpc.token.update.useMutation()

  const handleSubmitToken = form.handleSubmit(async (input) => {
    if (tokenId) {
      updater
        .mutateAsync({ tokenId, ...input })
        .then(() => {
          setIsOpen(false)
          onRefresh?.()
        })
        .catch((err: Error) => {
          toast({
            title: err.message || 'Failed to update token'
          })
        })
    } else {
      creator
        .mutateAsync(input)
        .then(() => {
          setIsOpen(false)
          onRefresh?.()
        })
        .catch((err) => {
          toast({
            title: 'Failed to create token'
          })
        })
    }
  })

  useGlobalEvent(EGlobalEvent.BTN_CREATE_TOKEN, () => {
    setIsOpen(true)
  })

  useEffect(() => {
    if (tokenData.data) {
      form.setValue('description', tokenData.data.description ?? '')
      form.setValue('type', tokenData.data.type)
      form.setValue('balance', tokenData.data.balance)
      form.setValue('weightOffset', tokenData.data.weightOffset)
      form.setValue(
        'expiredAt',
        tokenData.data.expireAt ? (new Date(tokenData.data.expireAt).toISOString().substr(0, 10) as any) : undefined
      )
      form.setValue('isMasterToken', tokenData.data.isMaster)
      form.setValue('workflowIds', tokenData.data.grantedWorkflows?.map((v) => v.workflow.id) ?? [])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenData.data])

  useEffect(() => {
    // Clear tokenId from query
    if (!isOpen) {
      route.push(pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const workflowSelectionOptions = workflows.data?.map((v) => ({ value: v.id, label: v.name ?? '' })) ?? []

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='text-base font-bold'>{tokenId ? t('title.update') : t('title.create')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmitToken} className='grid gap-2'>
            <FormField
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('description.label')}</FormLabel>
                  <FormDescription>{t.raw('description.hint')}</FormDescription>
                  <FormControl>
                    <Textarea placeholder={t('description.placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('type.label')}</FormLabel>
                  <FormDescription>
                    <span dangerouslySetInnerHTML={{ __html: t.raw('type.hint') }} />
                  </FormDescription>
                  <FormControl>
                    <Tabs value={field.value} onValueChange={(val) => field.onChange(val)} className='w-full'>
                      <TabsList>
                        <TabsTrigger value={ETokenType.Both}>{t('type.both')}</TabsTrigger>
                        <TabsTrigger value={ETokenType.Web}>{t('type.web')}</TabsTrigger>
                        <TabsTrigger value={ETokenType.Api}>{t('type.api')}</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='w-full grid grid-cols-2 gap-2'>
              <FormField
                name='balance'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('balance.label')}</FormLabel>
                    <FormDescription>
                      <span dangerouslySetInnerHTML={{ __html: t.raw('balance.hint') }} />
                    </FormDescription>
                    <FormControl>
                      <Input type='number' placeholder={t('balance.placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name='weightOffset'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('weight.label')}</FormLabel>
                    <FormDescription>{t.raw('weight.hint')}</FormDescription>
                    <FormControl>
                      <Input type='number' placeholder={t('weight.placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              name='expiredAt'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('expiry.label')}</FormLabel>
                  <FormDescription>{t.raw('expiry.hint')}</FormDescription>
                  <div className='flex items-center space-x-2'>
                    <Switch
                      id='unlimited-mode'
                      checked={!form.watch('expiredAt')}
                      onCheckedChange={(val) => {
                        field.onChange(val ? undefined : (new Date().toISOString().substr(0, 10) as any))
                      }}
                    />
                    <Label htmlFor='unlimited-mode'>{t('expiry.neverExpire')}</Label>
                  </div>
                  <FormControl>
                    <Input disabled={form.watch('expiredAt') === undefined} type='date' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name='isMasterToken'
              disabled={!isAdmin}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('master.label')}</FormLabel>
                  <FormDescription>{t.raw('master.hint')}</FormDescription>
                  <FormControl>
                    <Switch disabled={!isAdmin} checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name='workflowIds'
              disabled={isMasterToken}
              render={() => (
                <FormItem>
                  <FormLabel>{t('workflows.label')}</FormLabel>
                  <FormDescription>{t.raw('workflows.hint')}</FormDescription>
                  <FormControl>
                    <MultiSelect
                      disabled={isMasterToken}
                      modalPopover
                      defaultValue={form.watch('workflowIds') ?? []}
                      options={workflowSelectionOptions}
                      onValueChange={(val) => {
                        form.setValue('workflowIds', val)
                      }}
                      placeholder={t('workflows.placeholder')}
                      variant='inverted'
                      animation={1}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className='mt-2'>
              <Button
                type='button'
                disabled={creator.isPending || updater.isPending}
                onClick={() => setIsOpen(false)}
                variant='secondary'
              >
                {t('actions.cancel')} <X size={16} className='ml-1' />
              </Button>
              <LoadableButton type='submit' loading={creator.isPending || updater.isPending}>
                {!tokenId ? t('actions.create') : t('actions.update')} <Check size={16} className='ml-1' />
              </LoadableButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
