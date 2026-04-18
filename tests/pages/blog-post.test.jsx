import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import loadLocale from '@/assets/i18n'
import { ConfigProvider } from '@/lib/config'
import { LocaleProvider } from '@/lib/locale'
import { publicConfig } from '@/lib/server/config'
import BlogPostPage from '@/pages/[slug]'

vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

vi.mock('@/components/Comments', () => ({
  default: () => null
}))

describe('blog post page', () => {
  it('renders degraded article content instead of crashing', () => {
    const html = renderToStaticMarkup(
      <ConfigProvider value={publicConfig}>
        <LocaleProvider value={loadLocale('basic', publicConfig.lang)}>
          <BlogPostPage
            post={{
              id: 'post-1',
              title: 'Fixture Post',
              summary: 'Fixture summary',
              slug: 'fixture-post',
              type: ['Post'],
              date: 1704067200000,
              tags: ['Testing']
            }}
            blockMap={null}
            emailHash="hash"
            contentState="degraded"
          />
        </LocaleProvider>
      </ConfigProvider>
    )

    expect(html).toContain('Content is temporarily unavailable for this post')
    expect(html).toContain('Fixture Post')
  })
})
