import { useEffect } from 'react'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import { useConfig } from '@/lib/config'

import 'dayjs/locale/zh-cn'
import 'dayjs/locale/zh-tw'
import 'dayjs/locale/zh-hk'
import 'dayjs/locale/ja'
import 'dayjs/locale/es'

dayjs.extend(localizedFormat)

const localeMap = {
  'en-us': 'en',
  'zh-cn': 'zh-cn',
  'zh-hk': 'zh-hk',
  'zh-tw': 'zh-tw',
  'ja-jp': 'ja',
  'es-es': 'es'
}

export default function FormattedDate ({ date }) {
  const lang = useConfig().lang.toLowerCase()

  useEffect(() => {
    const locale = localeMap[lang] || 'en'
    dayjs.locale(locale)
  }, [lang])

  return <span>{dayjs(date).format('ll')}</span>
}
