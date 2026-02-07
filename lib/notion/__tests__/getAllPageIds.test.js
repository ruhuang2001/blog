import { describe, it, expect } from 'vitest'
import getAllPageIds from '../getAllPageIds'

describe('getAllPageIds', () => {
  it('extracts blockIds from collection_group_results', () => {
    const collectionQuery = {
      'col-1': {
        'view-1': {
          collection_group_results: {
            blockIds: ['id-1', 'id-2', 'id-3']
          }
        }
      }
    }
    const ids = getAllPageIds(collectionQuery)
    expect(ids).toEqual(['id-1', 'id-2', 'id-3'])
  })

  it('deduplicates ids across multiple views', () => {
    const collectionQuery = {
      'col-1': {
        'view-1': {
          collection_group_results: { blockIds: ['id-1', 'id-2'] }
        },
        'view-2': {
          collection_group_results: { blockIds: ['id-2', 'id-3'] }
        }
      }
    }
    const ids = getAllPageIds(collectionQuery)
    expect(ids).toEqual(['id-1', 'id-2', 'id-3'])
  })

  it('returns empty array when no blockIds exist', () => {
    const collectionQuery = {
      'col-1': {
        'view-1': {}
      }
    }
    const ids = getAllPageIds(collectionQuery)
    expect(ids).toEqual([])
  })

  it('uses specific viewId when provided', () => {
    const viewId = '12345678abcdefgh12345678abcdefgh'
    const uuid = '12345678-abcd-efgh-1234-5678abcdefgh'
    const collectionQuery = {
      'col-1': {
        [uuid]: {
          blockIds: ['id-A', 'id-B']
        },
        'other-view': {
          collection_group_results: { blockIds: ['id-X'] }
        }
      }
    }
    const ids = getAllPageIds(collectionQuery, viewId)
    expect(ids).toEqual(['id-A', 'id-B'])
  })
})
