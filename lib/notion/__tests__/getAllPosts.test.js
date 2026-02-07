import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/server/config', () => ({
  config: { sortByDate: false, timezone: 'Asia/Shanghai' }
}))

vi.mock('@/lib/server/notion-api', () => ({
  default: { getPage: vi.fn() }
}))

vi.mock('notion-utils', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual }
})

import api from '@/lib/server/notion-api'
import { getAllPosts } from '../getAllPosts'

const COLLECTION_ID = 'col-1'
const PAGE_ID = '9f4e8cee-030e-446d-9cab-1edc3ca040e9'

function buildResponse (posts) {
  const blockIds = []
  const block = {
    [PAGE_ID]: {
      spaceId: 'space-1',
      value: { value: { type: 'collection_view_page' }, role: 'reader' }
    }
  }

  posts.forEach(p => {
    blockIds.push(p.id)
    block[p.id] = {
      spaceId: 'space-1',
      value: {
        value: {
          properties: {
            title: [[p.title]],
            slug: [[p.slug]],
            type: [[p.type]],
            status: [[p.status]],
            summary: [[p.summary || '']]
          },
          created_time: p.createdTime || Date.now(),
          format: { page_full_width: false }
        },
        role: 'reader'
      }
    }
  })

  return {
    collection: {
      [COLLECTION_ID]: {
        spaceId: 'space-1',
        value: {
          value: {
            schema: {
              title: { name: 'title', type: 'title' },
              slug: { name: 'slug', type: 'text' },
              type: { name: 'type', type: 'select' },
              status: { name: 'status', type: 'select' },
              summary: { name: 'summary', type: 'text' }
            }
          },
          role: 'reader'
        }
      }
    },
    collection_query: {
      [COLLECTION_ID]: {
        'view-1': {
          collection_group_results: { blockIds }
        }
      }
    },
    block
  }
}

const samplePosts = [
  { id: 'post-1', title: 'Hello World', slug: 'hello-world', type: 'Post', status: 'Published', createdTime: Date.now() - 100000 },
  { id: 'post-2', title: 'Draft Post', slug: 'draft-post', type: 'Post', status: 'Draft', createdTime: Date.now() - 200000 },
  { id: 'page-1', title: 'About', slug: 'about', type: 'Page', status: 'Published', createdTime: Date.now() - 300000 }
]

beforeEach(() => {
  process.env.NOTION_PAGE_ID = '9f4e8cee030e446d9cab1edc3ca040e9'
  vi.clearAllMocks()
})

describe('getAllPosts', () => {
  it('returns published posts', async () => {
    api.getPage.mockResolvedValue(buildResponse(samplePosts))
    const posts = await getAllPosts({ includePages: false })
    expect(posts).toHaveLength(1)
    expect(posts[0].title).toBe('Hello World')
    expect(posts[0].slug).toBe('hello-world')
  })

  it('includes pages when requested', async () => {
    api.getPage.mockResolvedValue(buildResponse(samplePosts))
    const posts = await getAllPosts({ includePages: true })
    expect(posts).toHaveLength(2)
    const slugs = posts.map(p => p.slug)
    expect(slugs).toContain('hello-world')
    expect(slugs).toContain('about')
  })

  it('returns empty array when page is not a database', async () => {
    const response = buildResponse([])
    response.block[PAGE_ID].value.value.type = 'page'
    api.getPage.mockResolvedValue(response)
    const posts = await getAllPosts({ includePages: false })
    expect(posts).toEqual([])
  })

  it('returns empty array on API error', async () => {
    api.getPage.mockRejectedValue(new Error('Network error'))
    const posts = await getAllPosts({ includePages: false })
    expect(posts).toEqual([])
  })

  it('sets fullWidth from block format', async () => {
    const customPosts = [
      { id: 'post-fw', title: 'Full Width', slug: 'full-width', type: 'Post', status: 'Published' }
    ]
    const response = buildResponse(customPosts)
    response.block['post-fw'].value.value.format = { page_full_width: true }
    api.getPage.mockResolvedValue(response)
    const posts = await getAllPosts({ includePages: false })
    expect(posts[0].fullWidth).toBe(true)
  })
})
