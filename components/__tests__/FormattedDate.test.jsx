import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import FormattedDate from '@/components/FormattedDate'
import { ConfigProvider } from '@/lib/config'
import { publicConfig } from '@/lib/server/config'

describe('FormattedDate', () => {
  it('uses the configured timezone instead of the server or browser timezone', () => {
    const html = renderToStaticMarkup(
      <ConfigProvider
        value={{
          ...publicConfig,
          lang: 'en-US',
          timezone: 'America/Los_Angeles'
        }}
      >
        <FormattedDate date={Date.parse('2025-12-14T00:00:00Z')} />
      </ConfigProvider>
    )

    expect(html).toContain('Dec 13, 2025')
  })
})
