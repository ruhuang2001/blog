import { describe, expect, it } from 'vitest'
import { decorateRecordMap } from '../NotionRenderer'

describe('decorateRecordMap', () => {
  it('does not mutate the input record map when decorating custom blocks', () => {
    const recordMap = {
      block: {
        toggle: {
          value: {
            id: 'toggle',
            type: 'toggle'
          }
        },
        text: {
          value: {
            id: 'text',
            type: 'text'
          }
        }
      }
    }

    const nextRecordMap = decorateRecordMap(recordMap)

    expect(recordMap.block.toggle.value.type).toBe('toggle')
    expect(nextRecordMap.block.toggle.value.type).toBe('toggle_nobelium')
    expect(nextRecordMap.block.text).toBe(recordMap.block.text)
  })
})
