'use client'

import React from 'react'
import { cn } from '@/utils/style'

interface SnowProps {
  count?: number
}

export const Snow: React.FC<SnowProps> = ({ count = 50 }) => {
  return (
    <div className='fixed inset-0 pointer-events-none z-50'>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn('absolute w-2 h-2 bg-white rounded-full opacity-0', 'animate-snow')}
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * -10}s`,
            animationDuration: `${Math.random() * 5 + 8}s`,
            opacity: Math.random() * 0.8 + 0.2,
            transform: `scale(${Math.random() * 0.6 + 0.4})`
          }}
        />
      ))}
    </div>
  )
}
