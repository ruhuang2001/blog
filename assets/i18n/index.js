const localeMap = {
  'basic/en-US': () => import('./basic/en-US.json'),
  'basic/es-ES': () => import('./basic/es-ES.json'),
  'basic/ja-JP': () => import('./basic/ja-JP.json'),
  'basic/zh-CN': () => import('./basic/zh-CN.json'),
  'basic/zh-HK': () => import('./basic/zh-HK.json'),
  'basic/zh-TW': () => import('./basic/zh-TW.json')
}

/**
 * Lazy-load lang data
 *
 * @param {string} section - The section of lang data to load
 * @param {string} lang    - The language name
 * @returns {Promise<object>} - The content of a lang JSON
 */
export default function loadLocale (section, lang) {
  const key = `${section}/${lang}`
  const loader = localeMap[key]
  if (!loader) {
    console.warn(`Locale not found: ${key}`)
    return Promise.resolve({})
  }
  return loader().then(mod => mod.default || mod)
}
