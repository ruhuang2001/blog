import { DEFAULT_REVALIDATE_SECONDS, publicConfig, serverConfig } from '@/lib/server/config'
import { useRouter } from 'next/router'
import cn from 'classnames'
import { getAllPosts, getPostBlocks } from '@/lib/notion'
import { useLocale } from '@/lib/locale'
import { useConfig } from '@/lib/config'
import { createHash } from 'crypto'
import Container from '@/components/Container'
import Post from '@/components/Post'
import Comments from '@/components/Comments'
import { hasRenderableContent } from '@/lib/notion/adapter'

export default function BlogPost ({ post, blockMap, emailHash, contentState }) {
  const router = useRouter()
  const BLOG = useConfig()
  const locale = useLocale()

  const fullWidth = post.fullWidth ?? false

  return (
    <Container
      layout="blog"
      title={post.title}
      description={post.summary}
      slug={post.slug}
      // date={new Date(post.publishedAt).toISOString()}
      type="article"
      fullWidth={fullWidth}
    >
      <Post
        post={post}
        blockMap={blockMap}
        emailHash={emailHash}
        fullWidth={fullWidth}
        contentState={contentState}
      />

      {/* Back and Top */}
      <div
        className={cn(
          'px-4 flex justify-between font-medium text-gray-500 dark:text-gray-400 my-5',
          fullWidth ? 'md:px-24' : 'mx-auto max-w-2xl'
        )}
      >
        <a>
          <button
            onClick={() => router.push(BLOG.path || '/')}
            className="mt-2 cursor-pointer hover:text-black dark:hover:text-gray-100"
          >
            ← {locale.POST.BACK}
          </button>
        </a>
        <a>
          <button
            onClick={() => window.scrollTo({
              top: 0,
              behavior: 'smooth'
            })}
            className="mt-2 cursor-pointer hover:text-black dark:hover:text-gray-100"
          >
            ↑ {locale.POST.TOP}
          </button>
        </a>
      </div>

      <Comments frontMatter={post} />
    </Container>
  )
}

export async function getStaticPaths () {
  const posts = await getAllPosts({ includePages: true })
  return {
    paths: posts.map(row => `${publicConfig.path}/${row.slug}`),
    fallback: 'blocking'
  }
}

export async function getStaticProps ({ params: { slug } }) {
  const posts = await getAllPosts({ includePages: true })
  const post = posts.find(t => t.slug === slug)

  if (!post) return { notFound: true }

  let blockMap = null
  let contentState = 'ready'

  try {
    blockMap = await getPostBlocks(post.id)

    if (!hasRenderableContent(blockMap, post.id)) {
      contentState = 'degraded'
      blockMap = null
    }
  } catch (error) {
    console.error(`Failed to fetch blocks for post "${post.slug}":`, error)
    contentState = 'degraded'
  }

  const emailHash = createHash('md5')
    .update(serverConfig.email || '')
    .digest('hex')
    .trim()
    .toLowerCase()

  return {
    props: { post, blockMap, emailHash, contentState },
    revalidate: DEFAULT_REVALIDATE_SECONDS
  }
}
