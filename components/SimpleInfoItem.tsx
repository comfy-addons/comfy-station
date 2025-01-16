import { cn } from '@/utils/style'
import { IconProps } from '@radix-ui/react-icons/dist/types'
import { ForwardRefExoticComponent, ReactNode, RefAttributes, SVGProps } from 'react'

export const SimpleInfoItem: IComponent<{
  title: string
  className?: string
  iconCls?: React.ComponentProps<'div'>['className']
  Icon:
    | ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>
    | ForwardRefExoticComponent<
        Omit<SVGProps<SVGSVGElement>, 'ref'> & {
          title?: string
          titleId?: string
        } & RefAttributes<SVGSVGElement>
      >
  suffix?: ReactNode
}> = ({ title, Icon, iconCls, className, suffix }) => {
  return (
    <div className={cn('w-full items-center gap-3 flex p-2', className)}>
      <Icon width={16} height={16} className={iconCls} />
      <span>{title}</span>
      {!!suffix && <span className='ml-auto'>{suffix}</span>}
    </div>
  )
}
