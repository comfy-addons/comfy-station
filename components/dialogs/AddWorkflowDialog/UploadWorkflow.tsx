import { cn } from '@/utils/style'
import { UploadIcon } from 'lucide-react'
import { useCallback, useContext } from 'react'
import { useDropzone } from 'react-dropzone'
import { AddWorkflowDialogContext, EImportStep } from '.'
import { trpc } from '@/utils/trpc'
import { useToast } from '@/hooks/useToast'
import { isValidWorkflow } from '@/utils/workflow'

export const UploadWorkflow: IComponent = () => {
  const { toast } = useToast()
  const extensionFilter = trpc.extension.filter.useMutation()
  const { setRawWorkflow, setWorkflow, setStep } = useContext(AddWorkflowDialogContext)
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const rawWorkflow = JSON.parse(reader.result as string) as IWorkflow
          if (!isValidWorkflow(rawWorkflow)) {
            throw new Error('Invalid workflow file')
          }
          const extensionInfo = await extensionFilter.mutateAsync({
            labels: Object.values(rawWorkflow)
              .map((node) => node.class_type)
              .filter((v) => !!v)
          })
          for (const [, node] of Object.entries(rawWorkflow)) {
            const info = extensionInfo.find((info) => info.name === node.class_type)
            if (info) {
              node.info = info
            }
          }
          setRawWorkflow?.(rawWorkflow)
          setWorkflow?.((prev) => ({ ...prev, rawWorkflow: JSON.stringify(rawWorkflow) }))
          setStep?.(EImportStep.S1_WORKFLOW_INFO)
        } catch (e) {
          toast?.({
            title: 'Failed to parse workflow file',
            description: 'Please make sure the file is a valid workflow file',
            variant: 'destructive'
          })
        }
      }
      reader.readAsText(acceptedFiles[0])
    },
    [extensionFilter, setRawWorkflow, setStep, setWorkflow, toast]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/json': ['.json']
    }
  })
  return (
    <div
      {...getRootProps()}
      className={cn('absolute top-0 w-full h-full flex gap-2 items-center justify-center flex-col', {
        'text-primary': isDragActive,
        'dark:text-zinc-400 text-zinc-600': !isDragActive
      })}
    >
      <input {...getInputProps()} />
      <UploadIcon width={64} height={64} />
      <h1 className='text-sm font-medium'>DROP YOUR WORKFLOW FILE HERE</h1>
      <p className='max-w-lg text-center text-xs'>
        You can find your workflow file when clicking <strong>Export (API Format)</strong> under dropdown of save button
        in ComfyUI web interface. If you can not find it, please turn on <strong>Dev Mode</strong> on setting of ComfyUI
      </p>
    </div>
  )
}
