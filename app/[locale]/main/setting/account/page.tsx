'use client'

import { AttachmentImage } from '@/components/AttachmentImage'
import { LoadableButton } from '@/components/LoadableButton'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ECompressPreset } from '@/constants/enum'
import { useAttachmentUploader } from '@/hooks/useAttachmentUploader'
import { useToast } from '@/hooks/useToast'
import { trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { UpdateIcon } from '@radix-ui/react-icons'
import { useSession } from 'next-auth/react'
import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useTranslations } from 'next-intl'

export default function AccountPage() {
  const t = useTranslations('settings.account')
  const { data: session, update } = useSession()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const { uploader, uploadAttachment } = useAttachmentUploader()

  const UpdateSchema = z.object({
    password: z.string().min(8, t('password.minLength')),
    reEnterPassword: z.string().min(8, t('password.minLength'))
  })

  type TUpdateInput = z.infer<typeof UpdateSchema>

  const updateForm = useForm<TUpdateInput>({
    resolver: zodResolver(UpdateSchema),
    defaultValues: {
      password: '',
      reEnterPassword: ''
    }
  })

  const updater = trpc.user.userUpdate.useMutation()
  const user = session!.user

  const handleUpdate = updateForm.handleSubmit(async (data) => {
    if (data.password !== data.reEnterPassword) {
      updateForm.setError('reEnterPassword', {
        type: 'manual',
        message: t('repeatPassword.mismatch')
      })
      return
    }
    try {
      await updater.mutateAsync({
        password: data.password
      })
      updateForm.reset()
      toast({
        title: t('toast.success')
      })
    } catch (e) {
      toast({
        title: t('toast.failed'),
        color: 'destructive'
      })
    }
  })

  const handleUploadAvatar = async (file: File) => {
    await uploadAttachment(file, {
      resizeToMax: 512,
      compressPreset: ECompressPreset.PREVIEW
    })
      .then(async (res) => {
        await updater.mutateAsync({
          avatarId: res.id
        })
        toast({
          title: t('toast.avatarSuccess')
        })
        await update()
      })
      .catch((e) => {
        toast({
          title: t('toast.avatarFailed'),
          color: 'destructive'
        })
      })
  }

  return (
    <div className='w-full p-2 flex md:flex-row flex-col gap-4'>
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
      <AttachmentImage
        alt='User avatar'
        data={user.avatar}
        onClick={() => fileRef.current?.click()}
        containerClassName='aspect-square md:w-64 md:h-64 w-full rounded-lg overflow-hidden btn border'
      />
      <div className='flex flex-col flex-1 md:max-w-sm mt-4'>
        <label className='text-sm'>{t('email')}</label>
        <Input readOnly value={user.email} />

        <Form {...updateForm}>
          <form className='gap-2 flex flex-col items-center mt-2' onSubmit={handleUpdate}>
            <div className='w-full grid grid-cols-2 gap-2'>
              <FormField
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('password.label')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('password.placeholder')} type='password' {...field} />
                    </FormControl>
                    <FormDescription>{t('password.description')}</FormDescription>
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
                    <FormDescription>{t('repeatPassword.description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='w-full flex md:justify-end gap-2'>
              <LoadableButton loading={updater.isPending} type='submit' className='w-full mt-2 md:w-fit'>
                <UpdateIcon className='w-4 h-4 mr-2' /> {t('update')}
              </LoadableButton>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
