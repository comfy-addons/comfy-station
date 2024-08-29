'use client'

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { t } from '@mikro-orm/core'
import { EnterIcon, ExternalLinkIcon } from '@radix-ui/react-icons'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'

const Page: IComponent = () => {
  const t = useTranslations('auth.token')
  const form = useForm<{
    token: string
  }>({
    defaultValues: {
      token: ''
    }
  })
  return (
    <>
      <Form {...form}>
        <form className='space-y-4'>
          <FormField
            name='username'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('token')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('tokenPlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='flex justify-between w-full'>
            <Button variant='link' type='button'>
              Github <ExternalLinkIcon className='ml-2 w-4 h-4' />
            </Button>
            <Button type='submit'>
              {t('submit')} <EnterIcon className='ml-2 w-4 h-4' />
            </Button>
          </div>
        </form>
      </Form>
    </>
  )
}

export default Page
