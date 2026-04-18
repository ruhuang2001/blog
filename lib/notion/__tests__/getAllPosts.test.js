import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/server/config', () => ({
  serverConfig: { sortByDate: false, timezone: 'Asia/Shanghai' }
}))

vi.mock('@/lib/server/notion-api', () => ({
  default: {
    getPage: vi.fn(),
    getCollectionData: vi.fn(),
    getUsers: vi.fn()
  }
}))

import api from '@/lib/server/notion-api'
import { getAllPosts } from '../getAllPosts'

const DATABASE_ID = '11111111-1111-1111-1111-111111111111'
const COLLECTION_ID = '22222222-2222-2222-2222-222222222222'
const VIEW_ID = '33333333-3333-3333-3333-333333333333'

function makeEntry (value, nested = true) {
  return nested
    ? { value: { value, role: 'reader' } }
    : { value }
}

function buildDatabaseResponse (pageType = 'collection_view_page') {
  return {
    block: {
      [DATABASE_ID]: makeEntry({
        id: DATABASE_ID,
        type: pageType,
        collection_id: COLLECTION_ID,
        view_ids: [VIEW_ID]
      })
    },
    collection: {
      [COLLECTION_ID]: makeEntry({
        id: COLLECTION_ID,
        schema: {
          title: { name: 'title', type: 'title' },
          slug: { name: 'slug', type: 'text' },
          type: { name: 'type', type: 'select' },
          status: { name: 'status', type: 'select' },
          summary: { name: 'summary', type: 'text' },
          tags: { name: 'tags', type: 'multi_select' }
        }
      })
    },
    collection_view: {
      [VIEW_ID]: makeEntry({ id: VIEW_ID, type: 'table' })
    }
  }
}

function buildCollectionData (posts, nested = false) {
  return {
    result: {
      reducerResults: {
        collection_group_results: {
          blockIds: posts.map(post => post.id)
        }
      }
    },
    recordMap: {
      block: Object.fromEntries(
        posts.map(post => [
          post.id,
          makeEntry({
            id: post.id,
            type: 'page',
            parent_id: COLLECTION_ID,
            parent_table: 'collection',
            properties: {
              title: [[post.title]],
              slug: [[post.slug]],
              type: [[post.type]],
              status: [[post.status]],
              summary: [[post.summary || '']],
              ...(post.tags ? { tags: [[post.tags.join(',')]] } : {})
            },
            created_time: post.createdTime || Date.now(),
            format: { page_full_width: Boolean(post.fullWidth) }
          }, nested)
        ])
      )
    }
  }
}

const samplePosts = [
  {
    id: '44444444-4444-4444-4444-444444444444',
    title: 'Hello World',
    slug: 'hello-world',
    type: 'Post',
    status: 'Published',
    summary: 'Summary',
    tags: ['Testing'],
    createdTime: 1704067200000
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    title: 'About',
    slug: 'about',
    type: 'Page',
    status: 'Published',
    createdTime: 1704153600000
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    title: 'Draft Post',
    slug: 'draft-post',
    type: 'Post',
    status: 'Draft',
    createdTime: 1704240000000
  }
]

describe('getAllPosts', () => {
  beforeEach(() => {
    process.env.NOTION_PAGE_ID = DATABASE_ID.replace(/-/g, '')
    vi.clearAllMocks()
  })

  it('returns published posts from mixed Notion response shapes', async () => {
    api.getPage.mockResolvedValue(buildDatabaseResponse())
    api.getCollectionData.mockResolvedValue(buildCollectionData(samplePosts, false))

    const posts = await getAllPosts({ includePages: false })

    expect(posts).toHaveLength(1)
    expect(posts[0]).toMatchObject({
      title: 'Hello World',
      slug: 'hello-world',
      tags: ['Testing']
    })
  })

  it('includes pages when requested', async () => {
    api.getPage.mockResolvedValue(buildDatabaseResponse())
    api.getCollectionData.mockResolvedValue(buildCollectionData(samplePosts, true))

    const posts = await getAllPosts({ includePages: true })

    expect(posts).toHaveLength(2)
    expect(posts.map(post => post.slug)).toEqual(['hello-world', 'about'])
  })

  it('returns empty array when page is not a database', async () => {
    api.getPage.mockResolvedValue(buildDatabaseResponse('page'))
    api.getCollectionData.mockResolvedValue(buildCollectionData([]))

    const posts = await getAllPosts({ includePages: false })

    expect(posts).toEqual([])
  })

  it('returns empty array on API error', async () => {
    api.getPage.mockRejectedValue(new Error('Network error'))

    const posts = await getAllPosts({ includePages: false })

    expect(posts).toEqual([])
  })

  it('sets fullWidth from block format', async () => {
    api.getPage.mockResolvedValue(buildDatabaseResponse())
    api.getCollectionData.mockResolvedValue(buildCollectionData([
      {
        id: '77777777-7777-7777-7777-777777777777',
        title: 'Full Width',
        slug: 'full-width',
        type: 'Post',
        status: 'Published',
        fullWidth: true
      }
    ]))

    const posts = await getAllPosts({ includePages: false })

    expect(posts[0].fullWidth).toBe(true)
  })
})
