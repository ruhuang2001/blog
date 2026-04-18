import { describe, expect, it } from 'vitest'

import { decodeHtml, extractTalksFromHtml } from '@/lib/talks'

describe('decodeHtml', () => {
  it('decodes single-escaped entities', () => {
    expect(decodeHtml('Talk &quot;One&quot; &lt;Live&gt; &#39;26&#39; &amp; Beyond'))
      .toBe('Talk "One" <Live> \'26\' & Beyond')
  })

  it('does not double-decode ampersand-prefixed entities', () => {
    expect(decodeHtml('Literal &amp;quot;quote&amp;quot; &amp;amp; entity'))
      .toBe('Literal &quot;quote&quot; &amp; entity')
  })
})

describe('extractTalksFromHtml', () => {
  it('extracts talks with normalized dates and deduplicated URLs', () => {
    const html = `
      <section id="talks">
        <div class="post-title"><a href="/talk-a">Talk &amp;quot;One&amp;quot;</a></div>
        <div class="post-date">26/04/18</div>
        <div class="post-title"><a href="/talk-a">Talk &amp;quot;One&amp;quot;</a></div>
        <div class="post-date">26/04/18</div>
      </section>
    `

    expect(extractTalksFromHtml(html)).toEqual([
      {
        title: 'Talk &quot;One&quot;',
        url: 'https://ruhuang2001.github.io/talk-a',
        date: '2026-04-18'
      }
    ])
  })
})
