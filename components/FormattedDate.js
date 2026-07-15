import dayjs from '@/lib/dayjs'
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
  const { lang, timezone } = useConfig()
  const normalizedLang = lang.toLowerCase()
  const locale = localeMap[normalizedLang] || 'en'

  return <span>{dayjs(date).tz(timezone).locale(locale).format('ll')}</span>
}
