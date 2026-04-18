import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/notion', () => ({
  getPostBlocks: vi.fn()
}))

import { getPostBlocks } from '@/lib/notion'
import { generateRss } from '../rss'

describe('generateRss', () => {
  it('keeps generating the feed when post content rendering fails', async () => {
    getPostBlocks.mockRejectedValue(new Error('boom'))

    const xml = await generateRss([
      {
        id: 'post-1',
        title: 'Fixture Post',
        slug: 'fixture-post',
        summary: 'Fixture summary',
        date: 1704067200000
      }
    ])

    expect(xml).toContain('<feed')
    expect(xml).toContain('fixture-post')
  })
})
