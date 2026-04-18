import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/server/notion-api', () => ({
  default: { getPage: vi.fn() }
}))

import api from '@/lib/server/notion-api'
import { getPostBlocks } from '../getPostBlocks'

describe('getPostBlocks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes mixed nested and flat record map entries', async () => {
    api.getPage.mockResolvedValue({
      block: {
        'page-1': {
          value: {
            value: {
              id: 'page-1',
              type: 'page'
            }
          }
        },
        'text-1': {
          value: {
            id: 'text-1',
            type: 'text'
          }
        }
      },
      collection: {
        'col-1': {
          value: {
            value: {
              id: 'col-1'
            }
          }
        }
      }
    })

    const recordMap = await getPostBlocks('page-1')

    expect(recordMap.block['page-1'].value.type).toBe('page')
    expect(recordMap.block['text-1'].value.type).toBe('text')
    expect(recordMap.collection['col-1'].value.id).toBe('col-1')
  })
})
