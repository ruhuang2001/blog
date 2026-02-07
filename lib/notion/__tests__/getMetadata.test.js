import { describe, it, expect } from 'vitest'
import getMetadata from '../getMetadata'

describe('getMetadata', () => {
  it('extracts metadata from raw data', () => {
    const raw = {
      format: {
        block_locked: true,
        page_full_width: true,
        page_font: 'serif',
        page_small_text: false
      },
      created_time: 1700000000000,
      last_edited_time: 1700001000000
    }
    const result = getMetadata(raw)
    expect(result).toEqual({
      locked: true,
      page_full_width: true,
      page_font: 'serif',
      page_small_text: false,
      created_time: 1700000000000,
      last_edited_time: 1700001000000
    })
  })

  it('handles missing format gracefully', () => {
    const raw = { created_time: 1700000000000, last_edited_time: 1700001000000 }
    const result = getMetadata(raw)
    expect(result.locked).toBeUndefined()
    expect(result.page_full_width).toBeUndefined()
    expect(result.created_time).toBe(1700000000000)
  })
})
