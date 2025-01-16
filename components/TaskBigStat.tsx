import { cn } from '@/utils/style'
import { useMemo } from 'react'

export const TaskBigStat: IComponent<{
  title: string
  count: number
  loading?: boolean
  minDisplay?: number
  activeNumber?: {
    className?: string
  }
}> = ({ title, count, activeNumber, loading = false, minDisplay = 10000 }) => {
  const prefixZero = useMemo(() => {
    if (count === 0) {
      return '0000'
    }
    if (count > minDisplay) {
      return ''
    }
    let output = ''
    let tmpMinCount = minDisplay
    while (tmpMinCount > count) {
      output += '0'
      tmpMinCount = Math.floor(tmpMinCount / 10)
    }
    return output
  }, [count, minDisplay])

  return (
    <div className='flex flex-col md:items-end'>
      <div className='text-xs font-semibold'>{title}</div>
      <p
        className={cn('text-2xl md:text-5xl font-digital tracking-wide', {
          'animate-pulse': loading
        })}
      >
        {prefixZero.length > 0 && <span className='text-foreground/20'>{prefixZero}</span>}
        <span className={cn('text-foreground', activeNumber?.className)}>{count}</span>
      </p>
    </div>
  )
}
