import basicEnUs from './basic/en-US.json'
import basicEsEs from './basic/es-ES.json'
import basicJaJp from './basic/ja-JP.json'
import basicZhCn from './basic/zh-CN.json'
import basicZhHk from './basic/zh-HK.json'
import basicZhTw from './basic/zh-TW.json'

const localeMap = {
  'basic/en-US': basicEnUs,
  'basic/es-ES': basicEsEs,
  'basic/ja-JP': basicJaJp,
  'basic/zh-CN': basicZhCn,
  'basic/zh-HK': basicZhHk,
  'basic/zh-TW': basicZhTw
}

/**
 * Lazy-load lang data
 *
 * @param {string} section - The section of lang data to load
 * @param {string} lang    - The language name
 * @returns {object} - The content of a lang JSON
 */
export default function loadLocale (section, lang) {
  const key = `${section}/${lang}`
  const locale = localeMap[key]
  if (!locale) {
    console.warn(`Locale not found: ${key}`)
    return {}
  }
  return locale
}
