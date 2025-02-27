'use client'

import { Button } from '@/components/ui/button'
import { EUserRole } from '@/entities/enum'
import { trpc } from '@/utils/trpc'
import { LoadableButton } from '@/components/LoadableButton'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { User } from '@/entities/user'
import { useAttachmentUploader } from '@/hooks/useAttachmentUploader'
import { useToast } from '@/hooks/useToast'
import { zodResolver } from '@hookform/resolvers/zod'
import { UpdateIcon } from '@radix-ui/react-icons'
import { Image, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ECompressPreset } from '@/constants/enum'
import { useTranslations } from 'next-intl'

const UpdateSchema = z.object({
  avatarId: z.string().optional(),
  role: z.nativeEnum(EUserRole).default(EUserRole.User).optional(),
  balance: z
    .number({
      coerce: true
    })
    .default(-1)
    .optional(),
  weightOffset: z
    .number({
      coerce: true
    })
    .default(1)
    .optional(),
  password: z.string().optional(),
  reEnterPassword: z.string().optional()
})

type TUpdateInput = z.infer<typeof UpdateSchema>

export const UserUpdater: IComponent<{
  user: User
  onRefresh?: () => void
}> = ({ user, onRefresh }) => {
  const t = useTranslations('settings.userUpdater')
  const { toast } = useToast()
  const session = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const updater = trpc.user.adminUpdate.useMutation()
  const deletor = trpc.user.delete.useMutation()
  const { uploader, uploadAttachment } = useAttachmentUploader()
  const updateForm = useForm<TUpdateInput>({
    resolver: zodResolver(UpdateSchema),
    defaultValues: {
      avatarId: user.avatar?.id,
      role: user.role,
      balance: user.balance,
      weightOffset: user.weightOffset,
      password: '',
      reEnterPassword: ''
    }
  })

  const handleRefresh = () => {
    if (user.id === session.data?.user.id) {
      session.update()
    }
    onRefresh?.()
  }

  const handleUpdate = updateForm.handleSubmit(async (data) => {
    if (data.password?.length) {
      if (data.password.length < 8) {
        updateForm.setError('password', {
          type: 'manual',
          message: t('password.minLength')
        })
        return
      }
      if (data.password !== data.reEnterPassword) {
        updateForm.setError('reEnterPassword', {
          type: 'manual',
          message: t('password.mismatch')
        })
        return
      }
    }
    await updater
      .mutateAsync({
        id: user.id,
        avatarId: data.avatarId,
        role: data.role,
        balance: data.balance,
        weightOffset: data.weightOffset,
        password: data.password
      })
      .then(() => {
        toast({
          title: t('toast.updateSuccess'),
          description: t('toast.updateSuccessHint')
        })
      })
      .catch(() => {
        toast({
          title: t('toast.updateError'),
          description: t('toast.updateErrorHint'),
          variant: 'destructive'
        })
      })
    handleRefresh()
  })
  const handlePressDelete = async () => {
    if (user.id === session.data?.user.id) {
      toast({
        title: t('toast.deleteError'),
        description: t('toast.deleteErrorHint'),
        variant: 'destructive'
      })
      return
    }
    await deletor
      .mutateAsync({ id: user.id })
      .then(() => {
        toast({
          title: t('toast.deleteSuccess'),
          description: t('toast.deleteSuccessHint')
        })
      })
      .catch(() => {
        toast({
          title: t('toast.updateError'),
          description: t('toast.deleteFailedHint'),
          variant: 'destructive'
        })
      })
    handleRefresh()
  }
  const handleUploadAvatar = async (file: File) => {
    await uploadAttachment(file, {
      resizeToMax: 512,
      compressPreset: ECompressPreset.PREVIEW
    })
      .then(async (res) => {
        await updater.mutateAsync({
          id: user.id,
          avatarId: res.id
        })
        toast({
          title: 'Avatar uploaded'
        })
        handleRefresh()
      })
      .catch((e) => {
        toast({
          title: 'Avatar upload failed',
          color: 'destructive'
        })
      })
  }
  const handleReset = () => updateForm.reset()

  return (
    <Form {...updateForm}>
      <input
        ref={fileRef}
        type='file'
        className='hidden'
        accept='image/*'
        multiple={false}
        onChange={(e) => {
          if (e.target.files?.item(0)) {
            handleUploadAvatar(e.target.files.item(0)!)
          }
        }}
      />
      <form className='gap-2 p-2 flex flex-wrap items-center' onSubmit={handleUpdate}>
        <FormField
          name='role'
          render={({ field }) => (
            <FormItem className='w-1/2'>
              <FormLabel>{t('role.label')}</FormLabel>
              <div className='flex gap-2'>
                <Select
                  onValueChange={(val: any) => field.onChange(EUserRole[val as EUserRole])}
                  value={EUserRole[field.value]}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('role.placeholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={EUserRole[EUserRole.Admin]}>
                      <div className='flex items-center'>{t('role.options.admin')}</div>
                    </SelectItem>
                    <SelectItem value={EUserRole[EUserRole.Editor]}>
                      <div className='flex items-center'>{t('role.options.editor')}</div>
                    </SelectItem>
                    <SelectItem value={EUserRole[EUserRole.User]}>
                      <div className='flex items-center'>{t('role.options.user')}</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FormDescription>{t('role.hint')}</FormDescription>
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
                <FormControl>
                  <Input type='number' placeholder='-1' {...field} />
                </FormControl>
                <FormDescription>{t('balance.hint')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name='weightOffset'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('priority.label')}</FormLabel>
                <FormControl>
                  <Input type='number' placeholder='-1' {...field} />
                </FormControl>
                <FormDescription>{t('priority.hint')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className='w-full grid grid-cols-2 gap-2'>
          <FormField
            name='password'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('password.label')}</FormLabel>
                <FormControl>
                  <Input placeholder='****' type='password' {...field} />
                </FormControl>
                <FormDescription>{t('password.hint')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name='reEnterPassword'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('repeatPassword.label')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('repeatPassword.placeholder')} type='password' {...field} />
                </FormControl>
                <FormDescription>{t('repeatPassword.hint')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className='w-full flex flex-wrap gap-2'>
          <LoadableButton loading={updater.isPending} type='submit'>
            <UpdateIcon className='w-4 h-4 mr-2' /> {t('actions.update')}
          </LoadableButton>
          <Button disabled={deletor.isPending} onClick={handlePressDelete} type='button' variant='destructive'>
            <Trash2 className='w-4 h-4 mr-2' />
            {t('actions.delete')}
          </Button>
          <LoadableButton
            variant='outline'
            type='button'
            loading={uploader.isPending}
            onClick={() => {
              fileRef.current?.click()
            }}
          >
            <Image className='w-4 h-4 mr-2' /> {t('actions.updateAvatar')}
          </LoadableButton>
          <Button disabled={updater.isPending} type='button' onClick={handleReset} className='ml-auto' variant='ghost'>
            {t('actions.reset')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
