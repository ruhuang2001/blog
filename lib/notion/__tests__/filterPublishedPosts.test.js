import { describe, it, expect } from 'vitest'
import filterPublishedPosts from '../filterPublishedPosts'

const makePost = (overrides = {}) => ({
  id: 'post-1',
  title: 'Test Post',
  slug: 'test-post',
  type: ['Post'],
  status: ['Published'],
  date: Date.now() - 1000,
  ...overrides
})

describe('filterPublishedPosts', () => {
  it('returns empty array for null/empty input', () => {
    expect(filterPublishedPosts({ posts: null, includePages: false })).toEqual([])
    expect(filterPublishedPosts({ posts: [], includePages: false })).toEqual([])
  })

  it('keeps published posts', () => {
    const posts = [makePost()]
    const result = filterPublishedPosts({ posts, includePages: false })
    expect(result).toHaveLength(1)
  })

  it('filters out drafts', () => {
    const posts = [makePost({ status: ['Draft'] })]
    const result = filterPublishedPosts({ posts, includePages: false })
    expect(result).toHaveLength(0)
  })

  it('filters out posts without title', () => {
    const posts = [makePost({ title: '' })]
    const result = filterPublishedPosts({ posts, includePages: false })
    expect(result).toHaveLength(0)
  })

  it('filters out posts without slug', () => {
    const posts = [makePost({ slug: '' })]
    const result = filterPublishedPosts({ posts, includePages: false })
    expect(result).toHaveLength(0)
  })

  it('filters out future posts', () => {
    const futureDate = new Date('2099-01-01').getTime()
    const posts = [makePost({ date: futureDate })]
    const result = filterPublishedPosts({ posts, includePages: false })
    expect(result).toHaveLength(0)
  })

  it('excludes pages when includePages is false', () => {
    const posts = [
      makePost(),
      makePost({ id: 'page-1', type: ['Page'] })
    ]
    const result = filterPublishedPosts({ posts, includePages: false })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('post-1')
  })

  it('includes pages when includePages is true', () => {
    const posts = [
      makePost(),
      makePost({ id: 'page-1', type: ['Page'], slug: 'about' })
    ]
    const result = filterPublishedPosts({ posts, includePages: true })
    expect(result).toHaveLength(2)
  })

  it('filters out unknown types even with includePages', () => {
    const posts = [makePost({ type: ['Unknown'] })]
    const result = filterPublishedPosts({ posts, includePages: true })
    expect(result).toHaveLength(0)
  })
})
