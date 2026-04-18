import { describe, expect, it } from 'vitest'
import { DEFAULT_REVALIDATE_SECONDS, publicConfig, serverConfig } from '../config'

describe('config boundaries', () => {
  it('does not expose private config fields to the client', () => {
    expect(publicConfig.title).toBe(serverConfig.title)
    expect(publicConfig.link).not.toMatch(/\/$/)
    expect(publicConfig.email).toBeUndefined()
    expect(publicConfig.notionAccessToken).toBeUndefined()
    expect(publicConfig.notionPageId).toBeUndefined()
  })

  it('uses the default ISR interval of 300 seconds', () => {
    expect(DEFAULT_REVALIDATE_SECONDS).toBe(300)
  })
})
