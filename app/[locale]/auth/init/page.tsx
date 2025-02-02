'use client'

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { EnterIcon, ExternalLinkIcon } from '@radix-ui/react-icons'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { useRouter } from '@routing'
import { useEffect, useState } from 'react'
import { LoadableButton } from '@/components/LoadableButton'
import { NextPage } from 'next'
import { trpc, wsClient } from '@/utils/trpc'
import { Plus } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

const Page: NextPage = () => {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const t = useTranslations('auth.basic')
  const formSchema = z
    .object({
      username: z.string().min(2, { message: t('zod.username.min') }),
      password: z.string().min(6, { message: t('zod.password.min') }),
      confirmPassword: z.string()
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword']
    })
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: ''
    }
  })
  const { data: isEmptyUser } = trpc.user.isNotHaveAdmin.useQuery()
  const creator = trpc.user.firstUser.useMutation()

  const handleLogin = form.handleSubmit((data) => {
    setSubmitting(true)
    creator
      .mutateAsync({
        email: data.username,
        password: data.password
      })
      .then(() => {
        toast({
          title: 'Admin user created, please login!'
        })
        router.push('/auth/basic')
      })
      .catch((e) => {
        toast({
          title: e.message,
          variant: 'destructive'
        })
      })
      .finally(() => {
        setSubmitting(false)
      })
  })

  useEffect(() => {
    if (!isEmptyUser) {
      router.push('/auth/basic')
    }
  }, [isEmptyUser, router])

  return (
    <>
      <Form {...form}>
        <form className='space-y-4' onSubmit={handleLogin}>
          <FormField
            name='username'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('username')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('usernamePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name='password'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('password')}</FormLabel>
                <FormControl>
                  <Input type='password' placeholder={t('passwordPlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name='confirmPassword'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('confirmPasswordLabel')}</FormLabel>
                <FormControl>
                  <Input type='password' placeholder={t('confirmPasswordHint')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='flex justify-between w-full'>
            <Button variant='link' type='button'>
              Github <ExternalLinkIcon className='ml-2 w-4 h-4' />
            </Button>
            <LoadableButton type='submit' loading={submitting}>
              {t('createAdmin')} <Plus className='ml-2 w-4 h-4' />
            </LoadableButton>
          </div>
        </form>
      </Form>
    </>
  )
}

export default Page
