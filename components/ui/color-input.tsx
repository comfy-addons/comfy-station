import * as React from 'react'
import { cn } from '@/utils/style'

interface ColorInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  onColorChange?: (color: string) => void
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8'
}

export const ColorInput = React.forwardRef<HTMLInputElement, ColorInputProps>(
  ({ className, onColorChange, size = 'sm', defaultValue, ...props }, ref) => {
    const [color, setColor] = React.useState((defaultValue as string) || '#000000')

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newColor = e.target.value
      setColor(newColor)
      onColorChange?.(newColor)
    }

    return (
      <div className='relative inline-block'>
        <input
          type='color'
          ref={ref}
          {...props}
          value={color}
          onChange={handleChange}
          className={cn('appearance-none border-none bg-transparent p-0 cursor-pointer', sizeClasses[size], className)}
        />
      </div>
    )
  }
)

ColorInput.displayName = 'ColorInput'
