import { DEFAULT_REVALIDATE_SECONDS, publicConfig } from '@/lib/server/config'

import Container from '@/components/Container'
import BlogPost from '@/components/BlogPost'
import Pagination from '@/components/Pagination'
import { getAllPosts } from '@/lib/notion'

const Page = ({ postsToShow, page, showNext }) => {
  return (
    <Container>
      {postsToShow &&
        postsToShow.map(post => <BlogPost key={post.id} post={post} />)}
      <Pagination page={page} showNext={showNext} />
    </Container>
  )
}

export async function getStaticProps (context) {
  const page = Number(context.params.page)
  if (!Number.isInteger(page) || page < 2) {
    return { notFound: true }
  }

  const posts = await getAllPosts({ includePages: false })
  const postsToShow = posts.slice(
    publicConfig.postsPerPage * (page - 1),
    publicConfig.postsPerPage * page
  )
  const totalPosts = posts.length
  const showNext = page * publicConfig.postsPerPage < totalPosts

  if (!postsToShow.length) {
    return { notFound: true }
  }

  return {
    props: {
      page, // Current Page
      postsToShow,
      showNext
    },
    revalidate: DEFAULT_REVALIDATE_SECONDS
  }
}

export async function getStaticPaths () {
  const posts = await getAllPosts({ includePages: false })
  const totalPosts = posts.length
  const totalPages = Math.ceil(totalPosts / publicConfig.postsPerPage)
  return {
    // remove first page, we 're not gonna handle that.
    paths: Array.from({ length: Math.max(totalPages - 1, 0) }, (_, i) => ({
      params: { page: '' + (i + 2) }
    })),
    fallback: 'blocking'
  }
}

export default Page
