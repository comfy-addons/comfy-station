/**
 * Display tags using circles with colors,
 * each circle have it own color and overlap each other like avatar groups.
 */
import { AttachmentTag } from '@/entities/attachment_tag'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { Portal } from './Portal'

export const AttachmentTagColors: IComponent<{
  tags: AttachmentTag[]
}> = ({ tags }) => {
  if (!tags.length) return null
  return (
    <Tooltip>
      <TooltipTrigger>
        <div className='relative shadow'>
          {tags.map((tag, index) => (
            <div
              key={tag.id}
              className='rounded-full h-4 w-4 border border-white absolute'
              style={{
                backgroundColor: tag.color ?? '#000',
                right: `${index * 0.5}rem`,
                transition: 'background-color 0.3s',
                zIndex: tags.length - index // ensuring the latest tags are on top
              }}
            />
          ))}
        </div>
      </TooltipTrigger>
      <Portal>
        <TooltipContent>
          {tags
            .map((tag) => tag.name)
            .reverse()
            .join(', ')}
        </TooltipContent>
      </Portal>
    </Tooltip>
  )
}
