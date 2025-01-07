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

const UpdateSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  reEnterPassword: z.string().min(8, 'Password must be at least 8 characters')
})

type TUpdateInput = z.infer<typeof UpdateSchema>

export default function AccountPage() {
  const { data: session, update } = useSession()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const { uploader, uploadAttachment } = useAttachmentUploader()

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
        message: 'Password does not match'
      })
      return
    }
    try {
      await updater.mutateAsync({
        password: data.password
      })
      updateForm.reset()
      toast({
        title: 'Account updated'
      })
    } catch (e) {
      toast({
        title: 'Account update failed',
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
          title: 'Avatar uploaded'
        })
        await update()
      })
      .catch((e) => {
        toast({
          title: 'Avatar upload failed',
          color: 'destructive'
        })
      })
  }

  return (
    <div className='w-full p-2 flex gap-4'>
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
        containerClassName='w-64 h-64 rounded-lg overflow-hidden btn border'
      />
      <div className='flex flex-col flex-1 max-w-sm mt-4'>
        <label className='text-sm'>Email</label>
        <Input readOnly value={user.email} />

        <Form {...updateForm}>
          <form className='gap-2 flex flex-col items-center mt-2' onSubmit={handleUpdate}>
            <div className='w-full grid grid-cols-2 gap-2'>
              <FormField
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input placeholder='****' type='password' {...field} />
                    </FormControl>
                    <FormDescription>Set new password for user</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name='reEnterPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repeat password</FormLabel>
                    <FormControl>
                      <Input placeholder='****' type='password' {...field} />
                    </FormControl>
                    <FormDescription>Re-enter your new password</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='w-full flex justify-end gap-2'>
              <LoadableButton loading={updater.isPending} type='submit'>
                <UpdateIcon className='w-4 h-4 mr-2' /> Update
              </LoadableButton>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
