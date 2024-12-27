'use client'

/* eslint-disable @next/next/no-img-element */
import React, { ReactNode, useRef, useState } from 'react'
import { LoadingSVG } from './svg/LoadingSVG'
import { cn } from '@/lib/utils'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { Info } from 'lucide-react'

export interface LoadableImageProps {
  src?: string
  alt: string
  onClick?: () => void
  loading?: boolean
  className?: string
  fallback?: ReactNode
  containerClassName?: string
}

/**
 * LoadableImage component that shows a loading indicator while the image is downloading.
 * @param src - The source URL of the image.
 * @param alt - The alt text for the image.
 * @param className - Optional CSS class for the image.
 * @returns A React component that displays a loading indicator while the image is downloading.
 */
const LoadableImage: React.FC<LoadableImageProps> = ({
  src,
  alt,
  onClick,
  fallback,
  className,
  loading,
  containerClassName
}) => {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  /**
   * Handle the image load event.
   */
  const handleImageLoad = () => {
    setImageLoading(false)
  }

  /**
   * Handle the image error event.
   */
  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  const isLoading = loading || (!!src && imageLoading)

  return (
    <div
      className={cn(
        'w-full h-full',
        {
          'btn cursor-pointer': !!onClick
        },
        containerClassName
      )}
    >
      {isLoading && (
        <div className={cn('flex justify-center items-center h-full w-full', className)}>
          <LoadingSVG width={32} height={32} />
        </div>
      )}
      {imageError && (
        <div className={cn('flex justify-center items-center h-full w-full', className)}>
          {fallback || <ExclamationTriangleIcon width={32} height={32} />}
        </div>
      )}
      {!!src && (
        <img
          src={src}
          alt={alt}
          onClick={onClick}
          className={cn('w-full h-full object-cover', className)}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ display: isLoading && !imageError ? 'none' : 'block' }}
        />
      )}
      {!src && !isLoading && (
        <div onClick={onClick} className='flex justify-center items-center h-full w-full opacity-40'>
          {fallback || <Info width={32} height={32} />}
        </div>
      )}
    </div>
  )
}

export default LoadableImage
