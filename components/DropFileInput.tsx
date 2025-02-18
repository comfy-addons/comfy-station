import { useDropzone } from 'react-dropzone'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/utils/style'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { CopyPlus, Pencil, Plus, X } from 'lucide-react'
import { PhotoView } from 'react-photo-view'
import { TInputFileType, useFileDragStore } from '@/states/fileDrag'
import { AttachmentImage } from './AttachmentImage'
import { CreateMaskingDialog } from './dialogs/CreateMaskingDialog'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from './ui/context-menu'
import { cloneDeep } from 'lodash'
import { useKeygen } from '@/hooks/useKeygen'
import { useTranslations } from 'next-intl'

const DropFileInput: IComponent<{
  dragId: string
  defaultFiles?: TInputFileType[]
  maxFiles?: number
  disabled?: boolean
  onChanges?: (files: TInputFileType[]) => void
}> = ({ defaultFiles, disabled, onChanges, maxFiles, dragId }) => {
  const t = useTranslations('components.dropFileInput')
  const { gen } = useKeygen()
  const [maskingFile, setMaskingFile] = useState<TInputFileType | null>(null)
  const [showCreateMasking, setShowCreateMasking] = useState(false)

  const { draggingFile, setDraggingFile, addDragId, removeDragId, reqFiles, removeReqFiles } = useFileDragStore()
  const cacheRef = useRef(new Map<File, string>())
  const [files, setFiles] = useState<TInputFileType[]>(defaultFiles?.filter((v) => v instanceof File) || [])

  const addFiles = useCallback(
    (newFiles: TInputFileType[]) => {
      if (disabled) return
      // Convert files to Set to remove duplicates
      const uniqueFiles = new Set([...files, ...newFiles])
      const filesArray = Array.from(uniqueFiles)

      if (maxFiles && filesArray.length > maxFiles) {
        // If exceeding max files, only take the newest files up to maxFiles
        const newFilesArray = filesArray.slice(-maxFiles)
        setFiles(newFilesArray)
        onChanges?.(newFilesArray)
      } else {
        setFiles(filesArray)
        onChanges?.(filesArray)
      }
    },
    [disabled, files, maxFiles, onChanges]
  )

  const removeFile = useCallback(
    (file: TInputFileType) => {
      if (disabled) return
      setFiles(files.filter((f) => f !== file))
      onChanges?.(files.filter((f) => f !== file))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, files]
  )

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[], event: any) => {
      event?.preventDefault()

      // Handle files from another component
      if (draggingFile) {
        addFiles([...draggingFile])
        setDraggingFile(null)
        return
      }

      // Handle files from file system
      if (acceptedFiles.length > 0) {
        addFiles(acceptedFiles.map((file) => ({ type: 'file', data: file })))
      }
    },
    [addFiles, draggingFile, setDraggingFile]
  )

  const filesURL = useMemo(() => {
    return files.map((file) => {
      if (file.type === 'attachment') return file.data
      if (!cacheRef.current.has(file.data)) {
        cacheRef.current.set(file.data, URL.createObjectURL(file.data))
      }
      return cacheRef.current.get(file.data)!
    })
  }, [files])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    disabled,
    noClick: !!draggingFile // Prevent click when dragging between components
  })

  const isHaveDragFiles = isDragActive || !!draggingFile

  const dropzoneProps = {
    ...getRootProps(),
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      getRootProps().onDragOver?.(e as any)
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer.files.length === 0) {
        if (draggingFile) {
          addFiles([...draggingFile])
          setDraggingFile(null)
          return
        }
      } else {
        getRootProps().onDrop?.(e as any)
      }
    }
  }

  useEffect(() => {
    addDragId(dragId)
    return () => removeDragId(dragId)
  }, [addDragId, dragId, removeDragId])

  useEffect(() => {
    if (reqFiles.has(dragId)) {
      addFiles(reqFiles.get(dragId)!)
      removeReqFiles(dragId)
    }
  }, [addFiles, dragId, removeReqFiles, reqFiles])

  const renderFiles = useMemo(() => {
    return files.map((file, idx) => {
      const isImage = file.type === 'attachment' || file.data.type.startsWith('image/')
      if (isImage) {
        return (
          <div
            key={gen(file)}
            draggable
            onDragStart={() => setDraggingFile([file])}
            onDragEnd={() => {
              setDraggingFile(null)
              removeFile(file)
            }}
            style={{
              animationDelay: `${idx * 30}ms`,
              cursor: 'grab'
            }}
            className='flex items-center gap-2 relative group w-full aspect-square animate-fade border !rounded-md overflow-hidden'
          >
            <ContextMenu>
              <ContextMenuTrigger>
                {file.type === 'attachment' ? (
                  <AttachmentImage alt='image' data={{ id: file.data }} className='w-full h-full object-cover' />
                ) : (
                  <PhotoView src={filesURL[idx]}>
                    <Avatar className='!rounded-none w-full h-full'>
                      <AvatarImage src={filesURL[idx]} />
                      <AvatarFallback>{file.data.name}</AvatarFallback>
                    </Avatar>
                  </PhotoView>
                )}
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem>
                  <button
                    onClick={() => {
                      setMaskingFile(file)
                      setShowCreateMasking(true)
                    }}
                    className='flex items-center gap-2 h-full w-full'
                  >
                    {file.type === 'mask' ? <Pencil width={16} height={16} /> : <Plus width={16} height={16} />}
                    {file.type === 'mask' ? t('updateMask') : t('createMask')}
                  </button>
                </ContextMenuItem>
                <ContextMenuItem>
                  <button
                    onClick={() => {
                      addFiles([cloneDeep(file)])
                    }}
                    className='flex items-center gap-2 h-full w-full'
                  >
                    <CopyPlus className='w-4 h-4' /> {t('duplicate')}
                  </button>
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>

            <div className='absolute bottom-1 right-1 hidden group-hover:block'>
              <button
                onClick={() => removeFile(file)}
                className='bg-destructive text-white p-1 aspect-square rounded-full active:scale-75 transition-all'
              >
                <X width={16} height={16} />
              </button>
            </div>
          </div>
        )
      } else {
        // Other file types
        const shortName = file.data.name.slice(0, 4)
        const extension = file.data.name.split('.').pop()
        return (
          <div
            key={file.data.name}
            draggable
            onDragStart={() => setDraggingFile([file])}
            onDragEnd={() => {
              setDraggingFile(null)
              removeFile(file)
            }}
            style={{ cursor: 'grab' }}
            className='flex items-center gap-2 relative group'
          >
            <Avatar className='!rounded-md w-20 h-20'>
              <AvatarFallback className='!rounded-md flex flex-col gap-2'>
                {shortName} <span className='text-xs bg-zinc-200 px-2 py-[2px] rounded-lg'>{extension}</span>
              </AvatarFallback>
            </Avatar>
            <div className='absolute bottom-1 right-1 hidden group-hover:block'>
              <button
                onClick={() => removeFile(file)}
                className='bg-destructive text-white p-1 rounded-full active:scale-75 transition-all'
              >
                <X width={16} height={16} />
              </button>
            </div>
          </div>
        )
      }
    })
  }, [files, filesURL, removeFile, setDraggingFile])

  return (
    <div
      className={cn('flex flex-col gap-2', {
        'opacity-75 cursor-not-allowed': disabled
      })}
    >
      <CreateMaskingDialog
        open={showCreateMasking}
        file={maskingFile!}
        onOpenChange={(open) => {
          setShowCreateMasking(open)
        }}
        onSave={(mask) => {
          const newFile = new File([mask], `mask-${Date.now()}.png`, { type: 'image/png' })
          if (maskingFile?.type === 'mask') {
            // Update mask
            const newFiles = files.map((file) => {
              if (file === maskingFile) {
                return {
                  type: 'mask',
                  data: newFile,
                  original: maskingFile.original
                } as const
              }
              return file
            })
            setFiles(newFiles)
          } else {
            // Convert blob to file
            addFiles([
              {
                type: 'mask',
                data: newFile,
                original: cloneDeep(maskingFile!)
              }
            ])
          }
        }}
      />
      <div
        {...dropzoneProps}
        className={cn(
          'border px-10 py-5 h-[128px] rounded-xl border-dashed text-center hover:border-blue-300 cursor-pointer transition-all',
          'flex items-center justify-center',
          {
            'border-blue-500': isHaveDragFiles,
            'cursor-not-allowed': disabled
          }
        )}
      >
        <input {...getInputProps()} />
        {isHaveDragFiles ? <p>{t('dropHere')}</p> : <p>{t('dragAndDrop')}</p>}
      </div>
      <div className='w-full grid grid-cols-4 gap-2'>{renderFiles}</div>
    </div>
  )
}

export default DropFileInput
