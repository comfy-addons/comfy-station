import useClickEvent from '@/hooks/useClickEvent'
import { HTMLAttributes } from 'react'
import { HTMLMotionProps, m } from 'framer-motion'

interface IAddonDivProps extends HTMLAttributes<HTMLDivElement> {
  clickDelay?: number
}

export const AddonDiv: IComponent<IAddonDivProps & HTMLMotionProps<'div'>> = ({ clickDelay = 250, ...props }) => {
  const handler = useClickEvent(props.onClick as any, props.onDoubleClick as any, clickDelay)
  return <m.div {...props} onClick={handler} />
}
