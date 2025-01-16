import { cn } from '@/utils/style'
import { IconProps } from '@radix-ui/react-icons/dist/types'
import { ForwardRefExoticComponent, RefAttributes, SVGProps } from 'react'

export const MiniBadge: IComponent<{
  dotClassName?: string
  className?: string
  title?: string
  count?: number | string
  Icon?:
    | ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>
    | ForwardRefExoticComponent<
        Omit<SVGProps<SVGSVGElement>, 'ref'> & {
          title?: string
          titleId?: string
        } & RefAttributes<SVGSVGElement>
      >
}> = ({ Icon, className, dotClassName, title, count }) => {
  return (
    <div
      className={cn('flex gap-1 h-min justify-center items-center text-xs border rounded px-2 py-1 shadow', className)}
    >
      {!!Icon && <Icon width={16} height={16} />}
      {!!dotClassName && <div className={cn('w-2 h-2 rounded-full', dotClassName)} />}
      {!!title && <span>{title}</span>}
      {count !== undefined && <span>{count}</span>}
    </div>
  )
}
