import { cn } from '@/utils/style'

export const AnimateDiv: IComponent<{
  className?: string
  delayShow?: number
}> = ({ className, delayShow, children }) => {
  return (
    <div
      style={{
        animationDelay: `${delayShow}ms`
      }}
      className={cn('animate-fade animate-once animate-ease-in-out duration-500', className)}
    >
      {children}
    </div>
  )
}
