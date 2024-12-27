import { create } from 'zustand'
import { Card } from './ui/card'
import { HTMLAttributes, ReactElement, ReactNode, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { usePathname } from '@/i18n/routing'
import { useActionDebounce } from '@/hooks/useAction'
import useCurrentMousePosRef from '@/hooks/useCurrentMousePos'

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
  const {
    current: { x }
  } = useCurrentMousePosRef()
  const pathname = usePathname()
  const { active, renderContent, setRenderContent, containerCls } = useTooltipStore()

  const [isShowing, setIsShowing] = useState(false)
  const debounce = useActionDebounce(340, true)
  const [crrX, setCrrX] = useState(x)

  useEffect(() => {
    setCrrX(x)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, renderContent])

  useEffect(() => {
    setRenderContent(false)
  }, [pathname, setRenderContent])

  useEffect(() => {
    debounce(() => setIsShowing(active))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  return (
    <AnimatePresence>
      {isShowing && (
        <motion.div
          className={cn('fixed z-10 bottom-3 hidden md:flex pointer-events-none')}
          animate={{
            left: crrX > window.innerWidth / 2 ? 12 : 'unset',
            right: crrX > window.innerWidth / 2 ? 'unset' : 12
          }}
          exit={{ opacity: 0 }}
        >
          {
            <Card className={cn('min-w-[340px] !bg-background/50 backdrop-blur', containerCls)}>
              {!!renderContent && renderContent}
            </Card>
          }
        </motion.div>
      )}
    </AnimatePresence>
  )
}
