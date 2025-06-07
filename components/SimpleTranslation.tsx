'use client'
import { domAnimation, LazyMotion, m } from 'framer-motion'
import { twMerge } from 'tailwind-merge'

type TTranslateKey = number | string

export const SimpleTransitionLayout: IComponent<{ deps: TTranslateKey | Array<TTranslateKey>; className?: string }> = ({
  deps,
  children,
  className
}) => {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        key={Array.isArray(deps) ? deps.join('_') : deps}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={twMerge('z-0', className)}
      >
        {children}
      </m.div>
    </LazyMotion>
  )
}
