import { create } from 'zustand'
import { Card } from './ui/card'
import { HTMLAttributes, ReactElement, ReactNode, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ITooltipStore {
  active: boolean
  containerCls?: string
  renderContent: ReactNode
  setActive: (active: boolean) => void
  setContainerCls: (cls?: string) => void
  setRenderContent: (content: ReactNode | ((active: boolean) => ReactNode)) => void
}

const useTooltipStore = create<ITooltipStore>((set, get) => ({
  active: false,
  containerCls: '',
  renderContent: null as ReactNode,
  setActive: (active: boolean) => set({ active }),
  setContainerCls: (cls?: string) => set({ containerCls: cls }),
  setRenderContent: (content: ((active: boolean) => ReactNode) | ReactNode) => {
    set({ renderContent: typeof content === 'function' ? content(get().active) : content })
  }
}))

export const TooltipPopup: IComponent<
  {
    disabled?: boolean
    containerCls?: string
    tooltipContent: ReactNode | ((active: boolean) => ReactNode)
  } & HTMLAttributes<HTMLDivElement>
> = ({ tooltipContent, children, disabled, containerCls, ...props }) => {
  const { setRenderContent, setContainerCls, setActive } = useTooltipStore()

  return (
    <div
      {...props}
      className={cn('cursor-pointer', props.className)}
      onMouseEnter={() => {
        if (disabled) return
        setActive(true)
        setRenderContent(tooltipContent)
        setContainerCls(containerCls)
      }}
      onMouseLeave={() => {
        setActive(false)
      }}
    >
      {children}
    </div>
  )
}

export const TooltipPopupContainer: IComponent = () => {
  const [isHovering, setIsHovering] = useState(false)
  const { active, renderContent, containerCls } = useTooltipStore()
  return (
    <AnimatePresence>
      {(active || isHovering) && !!renderContent && (
        <motion.div
          className='fixed z-10 right-4 bottom-4 flex pointer-events-none backdrop-blur rounded-xl'
          exit={{ opacity: 0 }}
        >
          <Card
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className={cn('min-w-[340px] !bg-background/50 pointer-events-auto', containerCls)}
          >
            {renderContent}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
