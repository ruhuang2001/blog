import { getAllPosts } from '@/lib/notion'
import { generateRss } from '@/lib/rss'
export async function getServerSideProps ({ res }) {
  res.setHeader('Content-Type', 'text/xml')
  let xmlFeed = ''

  try {
    const posts = await getAllPosts({ includePages: false })
    const latestPosts = posts.slice(0, 10)
    xmlFeed = await generateRss(latestPosts)
  } catch (error) {
    console.error('Failed to generate RSS feed:', error)
    res.statusCode = 503
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    xmlFeed = 'Feed temporarily unavailable. Please try again later.'
  }

  res.write(xmlFeed)
  res.end()
  return {
    props: {}
  }
}
const feed = () => null
export default feed
