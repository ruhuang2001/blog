import dynamic from 'next/dynamic'
import { NotionRenderer as Renderer } from 'react-notion-x'
import { getTextContent } from 'notion-utils'
import { Collection as DefaultCollection } from 'react-notion-x/build/third-party/collection'
import { FONTS_SANS, FONTS_SERIF } from '@/consts'
import { useConfig } from '@/lib/config'
import Code from '@/components/notion-blocks/Code'

function Collection (props) {
  const { block } = props

  // The post header already renders the relevant metadata for collection-backed pages.
  // Skip Notion's duplicated collection page properties block to avoid hydration mismatch.
  if (block?.type === 'page' && block?.parent_table === 'collection') {
    return null
  }

  return <DefaultCollection {...props} />
}

const Mermaid = dynamic(() => import('@/components/notion-blocks/Mermaid'), { ssr: false })

function CodeSwitch (props) {
  return getTextContent(props.block.properties?.language) === 'Mermaid'
    ? <Mermaid {...props} />
    : <Code {...props} />
}

// Keep lazy component types stable across theme changes and other re-renders.
const components = {
  Code: CodeSwitch,
  // Database block
  Collection,
  // Equation block & inline variant
  Equation: dynamic(() => {
    return import('react-notion-x/build/third-party/equation').then(module => module.Equation)
  }),
  // PDF (Embed block)
  Pdf: dynamic(() => {
    return import('react-notion-x/build/third-party/pdf').then(module => module.Pdf)
  }, { ssr: false }),
  // Tweet block
  Tweet: dynamic(() => {
    return import('react-tweet-embed').then(module => {
      const { default: TweetEmbed } = module
      return function Tweet ({ id }) {
        return <TweetEmbed tweetId={id} options={{ theme: 'dark' }} />
      }
    })
  })
}

const mapPageUrl = id => `https://www.notion.so/${id.replace(/-/g, '')}`

/**
 * Notion page renderer
 *
 * A wrapper of react-notion-x/NotionRenderer with predefined `components` and `mapPageUrl`
 *
 * @param props - Anything that react-notion-x/NotionRenderer supports
 */
export default function NotionRenderer (props) {
  const config = useConfig()

  const font = {
    'sans-serif': FONTS_SANS,
    'serif': FONTS_SERIF
  }[config.font]

  return (
    <>
      <style jsx global>
        {`
        .notion {
          --notion-font: ${font};
        }
        `}
      </style>
      <Renderer
        components={components}
        mapPageUrl={mapPageUrl}
        {...props}
      />
    </>
  )
}
