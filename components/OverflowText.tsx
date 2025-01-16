/**
 * This component prevent text overflow outside and show tooltip when truncated
 */
import { cn } from '@/utils/style'
import { ClipboardIcon } from '@heroicons/react/24/outline'
import { useActionDebounce } from '@/hooks/useAction'
import { useWindowResize } from '@/hooks/useWindowResize'
import React, { HTMLAttributes, ReactNode, useRef, useState } from 'react'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
// import { toast } from "react-toastify";

const isEllipsisActive = (parent: HTMLDivElement, e: HTMLDivElement) => {
  const c = e.cloneNode(true) as HTMLDivElement
  c.style.position = 'absolute'
  c.style.display = 'inline'
  c.style.width = 'auto'
  c.className.replaceAll('truncate', '')
  c.className += ' whitespace-nowrap'
  c.style.visibility = 'hidden'
  parent.appendChild(c)
  const truncated = c.clientWidth > e.clientWidth
  c.remove()
  return truncated
}

export const OverflowText: IComponent<
  HTMLAttributes<HTMLDivElement> & {
    showCopy?: boolean
    textToCopy?: string
    renderTooltip?: ReactNode
  }
> = (props) => {
  const { showCopy, textToCopy, renderTooltip } = props
  const [isOverflow, setIsOverflow] = useState(false)
  const parentRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLDivElement | null>(null)

  const debounce = useActionDebounce(500, true)

  const onPressCopyToClipboard = (text?: string) => {
    if (text) {
      navigator.clipboard.writeText(text)
      // toast.success("Copied to clipboard", { autoClose: 1000 });
    }
  }

  useWindowResize(() => {
    debounce(() => {
      if (textRef.current && parentRef.current) {
        setIsOverflow(isEllipsisActive(parentRef.current, textRef.current))
      }
    })
  }, true)

  const passthroughProps = {
    ...props
  }
  delete passthroughProps.showCopy
  delete passthroughProps.textToCopy
  delete passthroughProps.renderTooltip

  return (
    <div
      className={cn('flex max-w-full flex-row group items-center', {
        'min-h-[32px]': showCopy
      })}
      ref={parentRef}
    >
      <Tooltip>
        <TooltipTrigger disabled={!isOverflow} className='w-full'>
          <div className='w-full'>
            <div
              {...passthroughProps}
              ref={textRef}
              className={cn('w-full group', { truncate: !props.className?.includes('line-clamp') }, props.className)}
            >
              <span>{props.children}</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className='max-w-sm bg-background text-foreground border'>
          {renderTooltip || props.children}
        </TooltipContent>
      </Tooltip>
      {showCopy && (
        <div className='px-1 md:hidden group-hover:flex'>
          <Button onClick={() => onPressCopyToClipboard(textToCopy)} variant='ghost' size='icon'>
            <ClipboardIcon width={12} height={12} />
          </Button>
        </div>
      )}
    </div>
  )
}
