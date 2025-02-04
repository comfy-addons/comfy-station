import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import vi from 'javascript-time-ago/locale/vi'
import zh from 'javascript-time-ago/locale/zh'
import { useLocale } from 'next-intl'

TimeAgo.addLocale(en)
TimeAgo.addLocale(vi)
TimeAgo.addLocale(zh)
// Initialize TimeAgo with the current locale
const getTimeAgo = (locale: string) => new TimeAgo(locale)

export const TimeAgoSpan: IComponent<{
  date: Date
  prefix?: string
  className?: string
}> = ({ prefix, date, className }) => {
  const locale = useLocale()
  const timeAgo = getTimeAgo(locale)
  return (
    <span className={className}>
      {prefix} {timeAgo.format(date)}
    </span>
  )
}
