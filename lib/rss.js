import { Feed } from 'feed'
import ReactDOMServer from 'react-dom/server'
import { publicConfig, serverConfig } from '@/lib/server/config'
import { getPostBlocks } from '@/lib/notion'
import { ConfigProvider } from '@/lib/config'
import NotionRenderer from '@/components/NotionRenderer'

const createFeedContent = async post => {
  let content = ''

  try {
    content = ReactDOMServer.renderToString(
      <ConfigProvider value={publicConfig}>
        <NotionRenderer recordMap={await getPostBlocks(post.id)} />
      </ConfigProvider>
    )
  } catch (error) {
    console.error(`Failed to render feed content for "${post.slug}":`, error)
  }

  const regexExp = /<div class="notion-collection-row"><div class="notion-collection-row-body"><div class="notion-collection-row-property"><div class="notion-collection-column-title"><svg.*?class="notion-collection-column-title-icon">.*?<\/svg><div class="notion-collection-column-title-body">.*?<\/div><\/div><div class="notion-collection-row-value">.*?<\/div><\/div><\/div><\/div>/g
  return content.replace(regexExp, '')
}

export async function generateRss(posts) {
  const year = new Date().getFullYear()
  const feed = new Feed({
    title: serverConfig.title,
    description: serverConfig.description,
    id: `${serverConfig.link}/${serverConfig.path}`,
    link: `${serverConfig.link}/${serverConfig.path}`,
    language: serverConfig.lang,
    favicon: `${serverConfig.link}/favicon.svg`,
    copyright: `All rights reserved ${year}, ${serverConfig.author}`,
    author: {
      name: serverConfig.author,
      email: serverConfig.email,
      link: serverConfig.link
    }
  })
  for (const post of posts) {
    feed.addItem({
      title: post.title,
      id: `${serverConfig.link}/${post.slug}`,
      link: `${serverConfig.link}/${post.slug}`,
      description: post.summary,
      content: await createFeedContent(post),
      date: new Date(post.date)
    })
  }
  return feed.atom1()
}
