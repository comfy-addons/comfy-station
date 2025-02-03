import { useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { ChevronLeft, Plus, PlusIcon, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { z } from 'zod'
import { EUserRole } from '@/entities/enum'
import { useAttachmentUploader } from '@/hooks/useAttachmentUploader'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select'
import { LoadableButton } from '../LoadableButton'
import { Input } from '../ui/input'
import LoadableImage from '../LoadableImage'
import { trpc } from '@/utils/trpc'
import { useToast } from '@/hooks/useToast'
import { dispatchGlobalEvent, EGlobalEvent } from '@/hooks/useGlobalEvent'
import { ECompressPreset } from '@/constants/enum'
import { SimpleTransitionLayout } from '@/components/SimpleTranslation'
import { useTranslations } from 'next-intl'

export const AddUserDialog: IComponent = () => {
  const t = useTranslations('settings.addUser')

  const NewUserSchema = z.object({
    avatarId: z.string().optional(),
    email: z.string().email(t('validation.invalidEmail')),
    role: z.nativeEnum(EUserRole).default(EUserRole.User),
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
    password: z.string().min(8, t('validation.passwordMinLength')),
    reEnterPassword: z.string().min(8, t('validation.passwordMinLength'))
  })
  type TNewUserInput = z.infer<typeof NewUserSchema>

  const [show, setShow] = useState(false)
  const [avatar, setAvatar] = useState<File>()

  const fileRef = useRef<HTMLInputElement>(null)

  const creator = trpc.user.adminCreate.useMutation()
  const { toast } = useToast()
  const { uploader, uploadAttachment } = useAttachmentUploader()

  const createForm = useForm<TNewUserInput>({
    resolver: zodResolver(NewUserSchema),
    defaultValues: {
      role: EUserRole.User
    }
  })

  const handleSubmit = createForm.handleSubmit(async (data) => {
    if (data.password !== data.reEnterPassword) {
      createForm.setError('reEnterPassword', {
        message: t('validation.passwordMismatch')
      })
      return
    }
    try {
      const avatarAttachment = avatar
        ? await uploadAttachment(avatar, {
            resizeToMax: 512,
            compressPreset: ECompressPreset.HIGH_JPG
          })
        : undefined
      await creator.mutateAsync({ ...data, avatarId: avatarAttachment?.id })
      toast({
        title: t('toast.success.title'),
        description: t('toast.success.description')
      })
      dispatchGlobalEvent(EGlobalEvent.RLOAD_USER_LIST)
      createForm.reset()
      setAvatar(undefined)
      setShow(false)
    } catch (e) {
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.description'),
        variant: 'destructive'
      })
    }
  })
  const handlePressCancel = () => {
    setAvatar(undefined)
    createForm.reset()
    setShow(false)
  }

  const avatarUrl = avatar ? URL.createObjectURL(avatar) : undefined

  return (
    <Dialog open={show} modal onOpenChange={setShow}>
      <DialogTrigger asChild>
        <Button
          onClick={() => {
            setShow(true)
          }}
          size='icon'
          className='rounded-full'
        >
          <PlusIcon width={16} height={16} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <Form {...createForm}>
          <input
            ref={fileRef}
            type='file'
            className='hidden'
            accept='image/*'
            multiple={false}
            onChange={(e) => {
              const file = e.target.files?.item(0)
              if (file) setAvatar(file)
            }}
          />
          <form className='gap-2 flex flex-wrap items-center' onSubmit={handleSubmit}>
            <div className='w-full flex gap-4'>
              <LoadableImage
                alt='New user avatar'
                containerClassName='btn w-20 h-20 rounded-xl overflow-hidden border'
                onClick={() => fileRef.current?.click()}
                src={avatarUrl}
              />
              <FormField
                name='email'
                render={({ field }) => (
                  <FormItem className='flex-1'>
                    <FormLabel>{t('email.title')}</FormLabel>
                    <FormControl>
                      <Input placeholder='user@exampler.com' {...field} />
                    </FormControl>
                    <FormDescription>{t('email.description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              name='role'
              render={({ field }) => (
                <FormItem className='w-full'>
                  <FormLabel>{t('role.title')}</FormLabel>
                  <div className='flex gap-2'>
                    <Select
                      onValueChange={(val: any) => field.onChange(EUserRole[val as EUserRole])}
                      value={EUserRole[field.value]}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select type of user' />
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
                  <FormDescription>{t('role.description')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='w-full grid grid-cols-2 gap-2'>
              <FormField
                name='balance'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('balance.title')}</FormLabel>
                    <FormControl>
                      <Input type='number' placeholder='-1' {...field} />
                    </FormControl>
                    <FormDescription>{t('balance.description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name='weightOffset'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('priority.title')}</FormLabel>
                    <FormControl>
                      <Input type='number' placeholder='-1' {...field} />
                    </FormControl>
                    <FormDescription>{t('priority.description')}</FormDescription>
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
                    <FormLabel>{t('password.title')}</FormLabel>
                    <FormControl>
                      <Input placeholder='****' type='password' {...field} />
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
                    <FormLabel>{t('repeatPassword.title')}</FormLabel>
                    <FormControl>
                      <Input placeholder='****' type='password' {...field} />
                    </FormControl>
                    <FormDescription>{t('repeatPassword.description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='w-full flex flex-wrap gap-2 justify-end mt-2'>
              <Button
                disabled={creator.isPending || uploader.isPending}
                onClick={handlePressCancel}
                type='button'
                variant='ghost'
              >
                <ChevronLeft className='w-4 h-4 mr-2' />
                {t('cancel')}
              </Button>
              <LoadableButton loading={creator.isPending || uploader.isPending} type='submit'>
                <Plus className='w-4 h-4 mr-2' /> {t('create')}
              </LoadableButton>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
