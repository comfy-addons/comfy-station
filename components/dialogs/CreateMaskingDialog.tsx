import React from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CreateMasking from '../CreateMasking'
import { TInputFileType } from '@/states/fileDrag'

interface CreateMaskingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file?: TInputFileType
  onSave?: (maskBlob: Blob) => void
}

export const CreateMaskingDialog: React.FC<CreateMaskingDialogProps> = ({ open, onOpenChange, file, onSave }) => {
  const [brushSize, setBrushSize] = React.useState(20)
  const [currentMask, setCurrentMask] = React.useState<Blob | null>(null)

  const handleMaskChange = (maskDataURL: string | null) => {
    if (!maskDataURL) {
      setCurrentMask(null)
      return
    }

    // Convert data URL to Blob
    fetch(maskDataURL)
      .then((res) => res.blob())
      .then((blob) => setCurrentMask(blob))
      .catch((err) => {
        console.error('Error converting mask to blob:', err)
        setCurrentMask(null)
      })
  }

  const handleSave = () => {
    if (currentMask && onSave) {
      onSave(currentMask)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[95vh] w-full flex flex-col p-0'>
        <DialogHeader className='pt-4 px-4'>
          <DialogTitle>{file?.type === 'mask' ? 'Edit Mask' : 'Create Mask'}</DialogTitle>
        </DialogHeader>

        <div className='flex flex-col gap-4 flex-grow'>
          <div className='relative w-full flex-grow shadow-inner border-t border-b'>
            <CreateMasking
              file={file ?? null}
              brushSize={brushSize}
              onBrushSizeChange={setBrushSize}
              onMaskChange={handleMaskChange}
            />
          </div>

          <div className='flex justify-end gap-2 pt-0 p-4'>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!currentMask}>
              Save Mask
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
