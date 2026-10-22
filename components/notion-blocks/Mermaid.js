import { useEffect, useState } from 'react'
import mermaid from 'mermaid'
import useTheme from '@/lib/theme'
import { getTextContent } from 'notion-utils'

let nextRenderId = 0

export default function Mermaid ({ block }) {
  const { dark } = useTheme()

  const source = getTextContent(block.properties.title)
  const [result, setResult] = useState(null)
  const current = result?.source === source && result?.dark === dark && result?.id === block.id
    ? result
    : null

  useEffect(() => {
    let cancelled = false
    mermaid.initialize({
      theme: dark ? 'dark' : 'neutral',
      securityLevel: 'strict',
      suppressErrorRendering: true
    })
    // Render outside React's DOM, with a fresh ID so pending renders cannot overwrite each other.
    mermaid.render(`mermaid-${block.id}-${nextRenderId++}`, source)
      .then(({ svg }) => {
        if (!cancelled) setResult({ id: block.id, source, dark, svg, failed: false })
      })
      .catch(() => {
        if (!cancelled) setResult({ id: block.id, source, dark, svg: '', failed: true })
      })
    return () => { cancelled = true }
  }, [block.id, source, dark])

  if (current?.failed) {
    return (
      <div role="status" className="w-full">
        <p>Diagram could not be rendered.</p>
        <pre className="overflow-auto">{source}</pre>
      </div>
    )
  }

  return (
    <div
      className="w-full leading-normal flex justify-center"
      dangerouslySetInnerHTML={{ __html: current?.svg || '' }}
    />
  )
}
