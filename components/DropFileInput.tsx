import { useDropzone } from 'react-dropzone'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { cn } from '@/utils/style'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { X } from 'lucide-react'
import { PhotoView } from 'react-photo-view'
import { useFileDragStore } from '@/states/fileDrag'

const DropFileInput: IComponent<{
  defaultFiles?: File[]
  maxFiles?: number
  disabled?: boolean
  onChanges?: (files: File[]) => void
}> = ({ defaultFiles, disabled, onChanges, maxFiles }) => {
  const { draggingFile, setDraggingFile } = useFileDragStore()
  const cacheRef = useRef(new Map<File, string>())
  const [files, setFiles] = useState<File[]>(defaultFiles?.filter((v) => v instanceof File) || [])

  const addFiles = useCallback(
    (newFiles: File[]) => {
      if (disabled) return
      if (maxFiles && files.length + newFiles.length > maxFiles) {
        setFiles([...newFiles])
        onChanges?.([...newFiles])
      } else {
        setFiles([...files, ...newFiles])
        onChanges?.([...files, ...newFiles])
      }
    },
    [disabled, files, maxFiles, onChanges]
  )

  const removeFile = useCallback(
    (file: File) => {
      if (disabled) return
      setFiles(files.filter((f) => f !== file))
      onChanges?.(files.filter((f) => f !== file))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, files]
  )

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[], event: any) => {
      // Handle files from another DropFileInput
      if (acceptedFiles.length === 0 && draggingFile) {
        addFiles([draggingFile])
        // Remove from source component
        setDraggingFile(null)
        return
      }
      addFiles(acceptedFiles)
    },
    [addFiles, draggingFile, setDraggingFile]
  )

  const filesURL = useMemo(() => {
    return files.map((file) => {
      if (!cacheRef.current.has(file)) {
        cacheRef.current.set(file, URL.createObjectURL(file))
      }
      return cacheRef.current.get(file)!
    })
  }, [files])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    disabled,
    noClick: !!draggingFile // Prevent click when dragging between components
  })

  const renderFiles = useMemo(() => {
    return files.map((file, idx) => {
      const isImage = file.type.startsWith('image/')
      if (isImage) {
        return (
          <div
            key={file.name}
            draggable
            onDragStart={() => setDraggingFile(file)}
            onDragEnd={() => {
              setDraggingFile(null)
              removeFile(file)
            }}
            style={{
              animationDelay: `${idx * 30}ms`,
              cursor: 'grab'
            }}
            className='flex items-center gap-2 relative group w-full aspect-square animate-fade'
          >
            <PhotoView src={filesURL[idx]}>
              <Avatar className='!rounded-md w-full h-full'>
                <AvatarImage src={filesURL[idx]} />
                <AvatarFallback>{file.name}</AvatarFallback>
              </Avatar>
            </PhotoView>
            <div className='absolute bottom-1 right-1 hidden group-hover:block'>
              <button
                onClick={() => removeFile(file)}
                className='bg-destructive text-white p-1 aspect-square rounded-full active:scale-75 transition-all'
              >
                <X width={16} height={16}/>
              </button>
            </div>
          </div>
        )
      } else {
        // Other file types
        const shortName = file.name.slice(0, 4)
        const extension = file.name.split('.').pop()
        return (
          <div
            key={file.name}
            draggable
            onDragStart={() => setDraggingFile(file)}
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
      <div
        {...getRootProps()}
        className={cn(
          'border px-10 py-5 h-[128px] rounded-xl border-dashed text-center hover:border-blue-300 cursor-pointer transition-all',
          'flex items-center justify-center',
          {
            'border-blue-500': isDragActive,
            'cursor-not-allowed': disabled
          }
        )}
      >
        <input {...getInputProps()} />
        {isDragActive ? <p>Drop the files here ...</p> : <p>Drag and drop some files here, or click to select files</p>}
      </div>
      <div className='w-full grid grid-cols-4 gap-2'>{renderFiles}</div>
    </div>
  )
}

export default DropFileInput
