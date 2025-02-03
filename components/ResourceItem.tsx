import { CopyIcon } from '@radix-ui/react-icons'
import { MiniBadge } from './MiniBadge'
import { Card } from './ui/card'
import { cn } from '@/utils/style'

export const ResourceItem: IComponent<{
  title: string
  count?: number
  loading?: boolean
  active?: boolean
  onClick?: () => void
  description: string
}> = ({ title, count, onClick, active, description, loading }) => {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'block !border-none select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        {
          'cursor-pointer': !!onClick,
          'animate-pulse repeat-infinite': loading,
          'bg-primary/10': active
        }
      )}
    >
      <div className='flex justify-between items-center'>
        <div className='font-medium leading-none'>{title}</div>
        {count !== undefined && <MiniBadge Icon={CopyIcon} count={count} />}
      </div>
      <p className='text-sm leading-snug text-muted-foreground'>{description}</p>
    </Card>
  )
}
