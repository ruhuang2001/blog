import { useEffect, useRef } from 'react'
import { init } from '@waline/client'
import { useConfig } from '@/lib/config'

const Waline = ({ path }) => {
  const BLOG = useConfig()
  const containerRef = useRef(null)
  const instanceRef = useRef(null)

  const walineConfig = BLOG.comment?.walineConfig || {}
  const serverURL = walineConfig.serverURL
  const lang = walineConfig.lang || BLOG.lang
  const meta = Array.isArray(walineConfig.meta) ? walineConfig.meta : []
  const requiredMeta = Array.isArray(walineConfig.requiredMeta)
    ? walineConfig.requiredMeta
    : []
  const emoji = Array.isArray(walineConfig.emoji) ? walineConfig.emoji : []
  const hasLocale =
    walineConfig.locale &&
    typeof walineConfig.locale === 'object' &&
    Object.keys(walineConfig.locale).length > 0
  const hasWordLimit =
    (typeof walineConfig.wordLimit === 'number' && walineConfig.wordLimit > 0) ||
    (Array.isArray(walineConfig.wordLimit) && walineConfig.wordLimit.length > 0)

  useEffect(() => {
    if (!containerRef.current || !serverURL) return

    if (instanceRef.current) {
      instanceRef.current.destroy()
      instanceRef.current = null
    }

    const options = {
      el: containerRef.current,
      serverURL,
      path,
      lang,
      dark: 'html.dark'
    }

    if (typeof walineConfig.pageview === 'boolean') {
      options.pageview = walineConfig.pageview
    }
    if (typeof walineConfig.comment === 'boolean') {
      options.comment = walineConfig.comment
    }
    if (emoji.length > 0) options.emoji = emoji
    if (meta.length > 0) options.meta = meta
    if (requiredMeta.length > 0) options.requiredMeta = requiredMeta
    if (hasWordLimit) options.wordLimit = walineConfig.wordLimit
    if (hasLocale) options.locale = walineConfig.locale

    instanceRef.current = init(options)

    return () => {
      instanceRef.current?.destroy()
      instanceRef.current = null
    }
  }, [
    serverURL,
    path,
    lang,
    walineConfig.pageview,
    walineConfig.comment,
    emoji,
    meta,
    requiredMeta,
    walineConfig.wordLimit,
    walineConfig.locale,
    hasLocale
  ])

  return <div id="waline" ref={containerRef} />
}

export default Waline
