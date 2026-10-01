import { useEffect, useState } from 'react'
import mermaid from 'mermaid'
import useTheme from '@/lib/theme'
import { getTextContent } from 'notion-utils'

let nextRenderId = 0

export default function Mermaid ({ block }) {
  const { dark } = useTheme()

  const source = getTextContent(block.properties.title)
  const [svg, setSVG] = useState('')

  useEffect(() => {
    let cancelled = false
    mermaid.initialize({ theme: dark ? 'dark' : 'neutral' })
    // Render outside React's DOM, with a fresh ID so pending renders cannot overwrite each other.
    mermaid.render(`mermaid-${block.id}-${nextRenderId++}`, source)
      .then(({ svg }) => {
        if (!cancelled) setSVG(svg)
      })
    return () => { cancelled = true }
  }, [block.id, source, dark])

  return (
    <div
      className="w-full leading-normal flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
