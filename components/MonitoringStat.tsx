import { ReactNode } from 'react'

export const MonitoringStat: IComponent<{
  icon: ReactNode
  title: string
  value: string
  valueCls?: string
  minWidth?: number
}> = ({ icon, title, value, minWidth = 86, valueCls }) => {
  return (
    <div className='flex gap-1 whitespace-nowrap items-center text-xs font-normal tabular-nums' style={{ minWidth }}>
      {icon}
      <code className='flex-auto'>{title}</code>
      <code className={valueCls}>{value}</code>
    </div>
  )
}
