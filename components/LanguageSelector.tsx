import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Languages } from 'lucide-react'
import { useRouter, usePathname } from '@routing'
import { useTranslations } from 'next-intl'

export const LanguageSelector: IComponent<{
  className?: string
}> = ({ className }) => {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('lang')

  // Get list of supported locales from routing config
  const locales = ['en', 'vi', 'zh']

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          size='icon' 
          variant='secondary'
          className='rounded-full shadow-lg border'
        >
          <Languages size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {locales.map(locale => (
          <DropdownMenuItem
            key={locale}
            onClick={() => router.replace(pathname, { locale })}
          >
            {t(locale as any)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
