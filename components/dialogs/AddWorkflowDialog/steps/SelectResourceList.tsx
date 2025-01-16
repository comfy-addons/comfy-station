import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { EResourceType, EValueSelectionType } from '@/entities/enum'
import { trpc } from '@/utils/trpc'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AttachmentReview } from '@/components/AttachmentReview'
import { Checkbox } from '@/components/ui/checkbox'
import { Check, ChevronsUpDown, TriangleAlertIcon } from 'lucide-react'
import { ListBulletIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/style'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { Label } from '@/components/ui/label'

export const SelectResourceList: IComponent<{
  selected?: {
    id?: string
    value: string
  }[]
  defaultValue?: string
  onChangeDefault?: (value: string) => void
  onChange?: (
    value: {
      id?: string
      value: string
    }[]
  ) => void
  type: EValueSelectionType
}> = ({ type, selected = [], onChange, defaultValue, onChangeDefault }) => {
  const [open, setOpen] = useState(false)
  const { data } = trpc.resource.list.useQuery(
    {
      type: type as unknown as EResourceType
    },
    {
      enabled: type !== EValueSelectionType.Custom
    }
  )

  const renderTable = useMemo(() => {
    if (type === EValueSelectionType.Custom) {
      return <span className='text-zinc-400'>NOT SUPPORTED YET</span>
    }
    return (
      <Table
        className='rounded-md border-border w-full overflow-clip relative'
        divClassname='max-h-screen overflow-y-scroll h-[50vh]'
      >
        <TableHeader className='sticky w-full top-0 z-50 h-10 bg-background'>
          <TableRow>
            <TableHead>
              <Checkbox
                checked={data?.length === selected.length}
                onCheckedChange={(v) =>
                  onChange?.(
                    v
                      ? (data?.map((v) => ({
                          id: v.id,
                          value: v.displayName?.trim() || v.name
                        })) ?? [])
                      : []
                  )
                }
              />
            </TableHead>
            <TableHead className='w-[100px]'>Thumbnail</TableHead>
            <TableHead className='w-[100px]'>Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>File name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Tags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((item) => {
            const shortName = item.name.slice(0, 2).toUpperCase()
            const toggle = () =>
              onChange?.(
                selected.some((v) => v.id === item.id)
                  ? selected.filter((v) => v.id !== item.id)
                  : [
                      ...selected,
                      {
                        id: item.id,
                        value: item.displayName?.trim() || item.name
                      }
                    ]
              )
            return (
              <TableRow key={item.id} onClick={toggle} className='cursor-pointer'>
                <TableCell>
                  <Checkbox
                    checked={selected.some((v) => v.id === item.id)}
                    onCheckedChange={(v) =>
                      onChange?.(
                        v
                          ? [
                              ...selected,
                              {
                                id: item.id,
                                value: item.displayName?.trim() || item.name
                              }
                            ]
                          : selected.filter((v) => v.id !== item.id)
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <AttachmentReview mode='avatar' shortName={shortName} data={item.image} />
                </TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell className='truncate max-w-[128px]'>{item.displayName?.trim() || '-'}</TableCell>
                <TableCell className='truncate max-w-[128px]'>{item.name}</TableCell>
                <TableCell className='truncate max-w-[128px]'>{item.description?.trim() || '-'}</TableCell>
                <TableCell>{item.tags.map((v) => v.name).join(', ')}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }, [data, onChange, selected, type])

  const currentName = useMemo(() => {
    const item = data?.find((item) => item.name === defaultValue || item.displayName === defaultValue)
    if (!item) return '-'
    return (item.displayName?.trim() || item.name).replaceAll('_', ' ')
  }, [data, defaultValue])

  return (
    <>
      <Sheet>
        <SheetTrigger className='w-full max-w-full py-2 mt-2 border rounded bg-background shadow hover:opacity-50 transition-all text-sm flex px-2 items-center gap-2'>
          <ListBulletIcon width={16} height={16} />
          {data?.length ?? 0} resources, {selected.length} selected
          {selected.length === 0 && <TriangleAlertIcon width={16} height={16} className='text-orange-500 ml-auto' />}
        </SheetTrigger>
        <SheetContent side='bottom'>
          <SheetHeader>
            <SheetTitle>List of selections</SheetTitle>
          </SheetHeader>
          {renderTable}
        </SheetContent>
      </Sheet>
      <Label>Default Selection</Label>
      <Popover open={open} modal onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            className='w-full h-fit justify-between whitespace-normal break-words'
          >
            <p className='w-full text-start'>{defaultValue ? currentName : 'Select default item...'}</p>
            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-full p-0'>
          <Command>
            <CommandInput placeholder='Search items...' />
            <CommandList>
              <CommandEmpty>No item found.</CommandEmpty>
              <CommandGroup>
                {selected.map((key) => {
                  const item = data?.find((v) => v.id === key.id)
                  return (
                    <CommandItem
                      key={key.id}
                      value={key.value}
                      onSelect={(currentValue) => {
                        onChangeDefault?.(
                          currentValue === defaultValue ? '' : item?.displayName?.trim() || item?.name || ''
                        )
                        setOpen(false)
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', defaultValue === item?.id ? 'opacity-100' : 'opacity-0')} />
                      {item?.displayName?.trim() || item?.name || key.value}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  )
}
