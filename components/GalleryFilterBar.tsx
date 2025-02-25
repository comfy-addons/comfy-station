import React from 'react'
import { AttachmentTag } from '@/entities/attachment_tag'
import { Tag, Star, X } from 'lucide-react'
import { Button } from './ui/button'
import { MultiSelect } from './ui-ext/multi-select'
import { useTranslations } from 'next-intl'
import { Badge } from './ui/badge'
import { cn } from '@/utils/style'

export type GalleryFilters = {
  onlyFavorites: boolean
  selectedTags: string[]
}

export const GalleryFilterBar: IComponent<{
  filters: GalleryFilters
  onChange: (filters: GalleryFilters) => void
  availableTags: AttachmentTag[]
  totalItems?: number
  className?: string
}> = ({ filters, onChange, availableTags, totalItems, className }) => {
  const t = useTranslations('components.gallery')

  return (
    <div className={cn('flex flex-wrap items-center gap-2 p-x rounded-md mb-2', className)}>
      <Button
        variant={filters.onlyFavorites ? 'default' : 'outline'}
        onClick={() =>
          onChange({
            ...filters,
            onlyFavorites: !filters.onlyFavorites
          })
        }
        className='flex items-center gap-1 h-10'
      >
        <Star className={filters.onlyFavorites ? 'fill-yellow-500 stroke-yellow-500' : ''} size={16} />
        <span>{t('favoritesFilter')}</span>
      </Button>

      <div className='flex-grow min-w-[200px]'>
        <MultiSelect
          options={
            availableTags?.map((tag) => ({
              label: tag.name,
              value: tag.id,
              color: tag.color ?? '#000000',
              icon: Tag
            })) || []
          }
          placeholder={t('tagsFilter')}
          defaultValue={filters.selectedTags}
          onValueChange={(tags) => {
            onChange({
              ...filters,
              selectedTags: tags
            })
          }}
          variant='inverted'
          maxCount={5}
        />
      </div>

      {(filters.onlyFavorites || filters.selectedTags.length > 0) && (
        <Button
          variant='ghost'
          size='sm'
          onClick={() =>
            onChange({
              onlyFavorites: false,
              selectedTags: []
            })
          }
          className='flex items-center gap-1 h-9'
        >
          <X size={14} />
          <span>{t('resetFilters')}</span>
        </Button>
      )}

      {typeof totalItems === 'number' && (
        <code className='text-xs text-muted-foreground px-2'>
          {totalItems} {t('resultsFound')}
        </code>
      )}
    </div>
  )
}
