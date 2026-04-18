import { useState } from 'react'
import axios from 'axios'
import Image from 'next/image'
import Container from '@/components/Container'
import FormattedDate from '@/components/FormattedDate'
import { useConfig } from '@/lib/config'
import { useLocale } from '@/lib/locale'
import { extractTalksFromHtml } from '@/lib/talks'

const TALKS_SOURCE_URL = 'https://ruhuang2001.github.io/'
const TALKS_SOURCE_ANCHOR = `${TALKS_SOURCE_URL}#talks`

const getTalkImageCandidates = talk => {
  const baseUrl = talk.url.endsWith('/') ? talk.url : `${talk.url}/`
  const slug = talk.url.split('/').filter(Boolean).pop()

  return [
    `${baseUrl}og-image.png`,
    `${baseUrl}screenshots/1.png`,
    `${baseUrl}${slug}.png`,
    'https://www.notion.so/images/page-cover/web_logistics.jpg'
  ]
}

function TalkThumbnail ({ talk }) {
  const [srcIndex, setSrcIndex] = useState(0)
  const sources = getTalkImageCandidates(talk)

  return (
    <Image
      src={sources[srcIndex]}
      alt={talk.title}
      fill
      unoptimized
      sizes="(min-width: 768px) 50vw, 100vw"
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      onError={() => {
        setSrcIndex(current => (current < sources.length - 1 ? current + 1 : current))
      }}
    />
  )
}

export async function getStaticProps () {
  let talks = []

  try {
    const response = await axios.get(TALKS_SOURCE_URL, { timeout: 10000 })
    talks = extractTalksFromHtml(response.data)
  } catch (error) {
    console.warn('Failed to fetch talks:', error.message)
  }

  return {
    props: {
      talks,
      sourceUrl: TALKS_SOURCE_ANCHOR
    },
    revalidate: 300
  }
}

export default function TalksPage ({ talks, sourceUrl }) {
  const locale = useLocale()
  const BLOG = useConfig()
  const title = locale?.NAV?.TALKS || 'Talks'
  const pageTitle = `${title} - ${BLOG.title}`

  return (
    <Container title={pageTitle} description={BLOG.description}>
      {talks.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-300">
          No talks available yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {talks.map(talk => (
            <a
              key={talk.url}
              href={talk.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-all duration-300"
            >
              <div className="aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                <TalkThumbnail talk={talk} />
              </div>
              <div className="p-4 flex flex-col gap-2">
                <h2 className="text-lg font-bold text-black dark:text-gray-100 group-hover:text-blue-500 transition-colors line-clamp-2">
                  {talk.title}
                </h2>
                {talk.date && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-mono">
                      <FormattedDate date={talk.date} />
                    </span>
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </Container>
  )
}
