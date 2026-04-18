import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/notion', () => ({
  getAllPosts: vi.fn(),
  getAllTagsFromPosts: vi.fn()
}))

import { getAllPosts, getAllTagsFromPosts } from '@/lib/notion'
import { getStaticProps as getTagStaticProps, getStaticPaths as getTagStaticPaths } from '@/pages/tag/[tag]'
import { getStaticProps as getPageStaticProps, getStaticPaths as getPageStaticPaths } from '@/pages/page/[page]'

describe('dynamic routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses blocking fallback for tag pages', async () => {
    getAllPosts.mockResolvedValue([
      { id: 'post-1', slug: 'fixture-post', tags: ['Testing'] }
    ])
    getAllTagsFromPosts.mockReturnValue({ Testing: 1 })

    const result = await getTagStaticPaths()

    expect(result.fallback).toBe('blocking')
  })

  it('returns notFound for unknown tags', async () => {
    getAllPosts.mockResolvedValue([
      { id: 'post-1', slug: 'fixture-post', tags: ['Testing'] }
    ])
    getAllTagsFromPosts.mockReturnValue({ Testing: 1 })

    const result = await getTagStaticProps({ params: { tag: 'Missing' } })

    expect(result).toEqual({ notFound: true })
  })

  it('uses blocking fallback for paginated pages', async () => {
    getAllPosts.mockResolvedValue([
      { id: 'post-1' },
      { id: 'post-2' }
    ])

    const result = await getPageStaticPaths()

    expect(result.fallback).toBe('blocking')
  })

  it('returns notFound for invalid page numbers', async () => {
    const result = await getPageStaticProps({ params: { page: '1' } })

    expect(result).toEqual({ notFound: true })
  })
})
