import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'
import vi from 'javascript-time-ago/locale/vi'
import zh from 'javascript-time-ago/locale/zh'
import { useLocale } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

TimeAgo.addLocale(en)
TimeAgo.addLocale(vi)
TimeAgo.addLocale(zh)
// Initialize TimeAgo with the current locale
const getTimeAgo = (locale: string) => new TimeAgo(locale)

const REFETCH_INTERVAL = 5000

export const TimeAgoSpan: IComponent<{
  date: Date
  prefix?: string
  className?: string
}> = ({ prefix, date, className }) => {
  const [timeStr, setTimeStr] = useState(date.toLocaleString())
  const locale = useLocale()
  const timeAgoRef = useRef(getTimeAgo(locale))

  const updateTime = useCallback(() => setTimeStr(timeAgoRef.current.format(date, 'twitter-now')), [date, timeAgoRef])

  useEffect(() => {
    updateTime()
    const interval = setInterval(updateTime, REFETCH_INTERVAL)
    return () => clearInterval(interval)
  }, [updateTime])

  return (
    <span className={className}>
      {prefix} {timeStr}
    </span>
  )
}
