import { LoadableButton } from '@/components/LoadableButton'
import { LoadingSVG } from '@/components/svg/LoadingSVG'
import { MultiSelect } from '@/components/ui-ext/multi-select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ECompressPreset } from '@/constants/enum'
import { EAttachmentStatus, EResourceType } from '@/entities/enum'
import { useActionDebounce } from '@/hooks/useAction'
import { useAttachmentUploader } from '@/hooks/useAttachmentUploader'
import { useToast } from '@/hooks/useToast'
import { trpc } from '@/utils/trpc'
import { CheckIcon } from '@heroicons/react/24/outline'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Tag } from 'lucide-react'
import { FocusEventHandler, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

export const CheckpointLoraItem: IComponent<{
  resourceFileName: string
  type?: EResourceType.Lora | EResourceType.Checkpoint
}> = ({ resourceFileName: ckptName, type = EResourceType.Checkpoint }) => {
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const debounce = useActionDebounce(1000, true)
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const {
    data: resourceInfo,
    isLoading,
    refetch
  } = trpc.resource.get.useQuery(
    {
      name: ckptName,
      type
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false
    }
  )
  const data = resourceInfo?.info

  const { data: image, isLoading: imageLoading } = trpc.attachment.get.useQuery(
    {
      id: data?.image?.id!
    },
    {
      enabled: !!data?.image?.id
    }
  )

  const { data: tags, refetch: refetchTags } = trpc.tag.list.useQuery()
  const createTag = trpc.tag.create.useMutation()
  const creator = trpc.resource.create.useMutation()
  const updater = trpc.resource.update.useMutation()
  const { uploader, uploadAttachment } = useAttachmentUploader()

  const shortName = ckptName.slice(0, 2)
  const formSchema = z.object({
    displayName: z.string().optional().nullable().default(''),
    description: z.string().optional().nullable().default('')
  })
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema)
  })

  const ensureCreated = async () => {
    if (!data?.id) {
      const item = await creator.mutateAsync({
        name: ckptName,
        type
      })
      return item.id
    }
    return data.id
  }
  const handlePressSubmit = form.handleSubmit(async (formData) => {
    debounce(async () => {
      const id = await ensureCreated()
      updater
        .mutateAsync({
          id,
          title: formData.displayName ?? '',
          description: formData.description ?? ''
        })
        .then(() => refetch())
    })
  })

  const handleUpdateTags = async (newTags: string[]) => {
    setSelectedTags(newTags)
    debounce(async () => {
      const id = await ensureCreated()
      updater
        .mutateAsync({
          id,
          tags: newTags
        })
        .then(() => refetch())
    })
  }

  useEffect(() => {
    if (data) {
      form.reset({
        displayName: data.displayName,
        description: data.description
      })
      setSelectedTags(data.tags.map((tag) => tag.name))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const handleUploadImage = async (file: File) => {
    let id = await ensureCreated()
    uploadAttachment(file, {
      resizeToMax: 512,
      compressPreset: ECompressPreset.PREVIEW
    }).then((res) => {
      if (res.status === EAttachmentStatus.UPLOADED) {
        toast({
          title: 'Image uploaded'
        })
        updater
          .mutateAsync({
            id,
            imageId: res.id
          })
          .finally(refetch)
      } else {
        toast({
          title: 'Image upload failed',
          color: 'destructive'
        })
      }
    })
  }

  const handleFocusOut: FocusEventHandler<HTMLFormElement> = (event) => {
    const form = event.currentTarget
    if (!form.contains(event.relatedTarget)) {
      handlePressSubmit()
    }
  }

  const tagsOptions = useMemo(() => {
    if (!tags) return []
    return tags?.map((tag) => {
      return {
        label: tag.info.name,
        value: tag.info.name,
        icon: Tag,
        suffix: (
          <Tooltip>
            <TooltipTrigger className='flex flex-auto justify-end gap-1 ml-4'>
              {/* <Badge variant='outline'>
                {tag.countExtension} <Blocks width={12} height={12} className='ml-1' />
              </Badge> */}
              <Badge variant='outline'>
                {tag.countResource} <Box width={12} height={12} className='ml-1' />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Used in {tag.countResource} resources</TooltipContent>
          </Tooltip>
        )
      }
    })
  }, [tags])

  return (
    <div className='w-full flex p-2 py-4 gap-2'>
      <input
        ref={fileRef}
        type='file'
        className='hidden'
        accept='image/*'
        multiple={false}
        onChange={(e) => {
          if (e.target.files?.item(0)) {
            handleUploadImage(e.target.files.item(0)!)
          }
        }}
      />
      <Avatar onClick={() => fileRef.current?.click()} className='m-2 w-16 h-16 !rounded-md cursor-pointer btn'>
        <AvatarImage src={uploader.isPending ? undefined : image?.raw?.url || undefined} alt={ckptName || `@${type}`} />
        <AvatarFallback className='rounded-md uppercase'>
          {uploader.isPending && <LoadingSVG width={16} height={16} className='repeat-infinite' />}
          {!uploader.isPending && shortName}
        </AvatarFallback>
      </Avatar>
      <div className='w-full flex flex-col gap-2'>
        <span className='text-sm font-semibold'>{ckptName}</span>
        <Form {...form}>
          <form className='space-y-4 min-w-80' onBlur={handleFocusOut}>
            <FormField
              name='displayName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Same as file name...' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder='A cool model for anime drawing...' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <div className='w-full flex flex-wrap items-center'>
          <MultiSelect
            modalPopover
            options={tagsOptions}
            defaultValue={selectedTags}
            onValueChange={handleUpdateTags}
            onCreateNew={(tag) => {
              createTag.mutateAsync(tag).then(() => refetchTags().then(() => setSelectedTags([...selectedTags, tag])))
            }}
            placeholder='Select tags'
            variant='inverted'
            animation={1}
          />
          {!!data?.id && (
            <div className='ml-auto mt-2'>
              <Tooltip>
                <TooltipTrigger className='flex items-center gap-1'>
                  {!!data?.updateAt && (
                    <span className='text-xs text-secondary-foreground'>
                      {new Date(data?.updateAt).toLocaleString()}
                    </span>
                  )}
                  <LoadableButton loading={updater.isPending} variant='ghost' size='icon'>
                    <CheckIcon className='text-green-500' width={18} height={18} />
                  </LoadableButton>
                </TooltipTrigger>
                <TooltipContent side='left'>
                  Resource&apos;s information is {updater.isPending ? 'updating...' : 'saved'}
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
