import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/server/notion-api', () => ({
  default: {
    getUsers: vi.fn()
  }
}))

describe('getPageProperties', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('caches person lookups while preserving repeated people in output', async () => {
    const { default: api } = await import('@/lib/server/notion-api')
    const { default: getPageProperties } = await import('../getPageProperties')

    api.getUsers.mockResolvedValue({
      recordMapWithRoles: {
        notion_user: {
          'user-1': {
            value: {
              value: {
                id: 'user-1',
                given_name: 'Ada',
                family_name: 'Lovelace',
                profile_photo: 'https://example.com/ada.png'
              }
            }
          }
        }
      }
    })

    const block = {
      'page-1': {
        value: {
          properties: {
            people: [
              [[['u', 'user-1']]],
              [[['u', 'user-1']]]
            ]
          }
        }
      }
    }

    const schema = {
      people: { name: 'authors', type: 'person' }
    }

    const properties = await getPageProperties('page-1', block, schema)

    expect(api.getUsers).toHaveBeenCalledTimes(1)
    expect(properties.authors).toEqual([
      {
        id: 'user-1',
        first_name: 'Ada',
        last_name: 'Lovelace',
        profile_photo: 'https://example.com/ada.png'
      },
      {
        id: 'user-1',
        first_name: 'Ada',
        last_name: 'Lovelace',
        profile_photo: 'https://example.com/ada.png'
      }
    ])
  })
})
