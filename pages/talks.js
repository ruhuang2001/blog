import axios from 'axios'
import Container from '@/components/Container'
import FormattedDate from '@/components/FormattedDate'
import { useConfig } from '@/lib/config'
import { useLocale } from '@/lib/locale'
import { extractTalksFromHtml } from '@/lib/talks'

const TALKS_SOURCE_URL = 'https://ruhuang2001.github.io/'
const TALKS_SOURCE_ANCHOR = `${TALKS_SOURCE_URL}#talks`

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
                <img
                  src={`${talk.url.endsWith('/') ? talk.url : talk.url + '/'}og-image.png`}
                  alt={talk.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    const currentSrc = e.target.src
                    const baseUrl = talk.url.endsWith('/') ? talk.url : talk.url + '/'
                    const slugPng = `${baseUrl}${talk.url.split('/').filter(Boolean).pop()}.png`
                    if (currentSrc.endsWith('og-image.png')) {
                      e.target.src = `${baseUrl}screenshots/1.png`
                    } else if (currentSrc.endsWith('screenshots/1.png')) {
                      e.target.src = slugPng
                    } else if (currentSrc.endsWith('.png')) {
                      e.target.onerror = null
                      e.target.src = 'https://www.notion.so/images/page-cover/web_logistics.jpg' // Fallback
                    }
                  }}
                />
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
