async (page) => {
  page.setDefaultTimeout(10000)
  page.setDefaultNavigationTimeout(15000)
  const origin = new URL(page.url()).origin
  const report = { origin, checks: [], metrics: {}, pageErrors: [], consoleErrors: [], localFailures: [] }
  const onError = error => report.pageErrors.push({ url: page.url(), message: error.message })
  const onConsole = message => {
    if (message.type() === 'error') report.consoleErrors.push(message.text())
  }
  const onFailure = request => {
    if (request.url().startsWith(origin) && !request.failure()?.errorText.includes('ERR_ABORTED')) {
      report.localFailures.push({ url: request.url(), error: request.failure()?.errorText })
    }
  }
  page.on('pageerror', onError)
  page.on('console', onConsole)
  page.on('requestfailed', onFailure)
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  const check = async (name, action) => {
    try { await action(); report.checks.push({ name, passed: true }) }
    catch (error) { report.checks.push({ name, passed: false, error: error.message }) }
  }
  const visit = route => page.goto(origin + route, { waitUntil: 'domcontentloaded' })
  const screenshot = name => page.screenshot({ path: `output/playwright/e2e-${name}.png`, fullPage: true })
  const titles = () => page.locator('main article h2').allTextContents()
  const expectedTitles = Array.from({ length: 9 }, (_, i) => i ? `Fixture Post ${i + 1}` : 'Fixture Post')
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.emulateMedia({ colorScheme: 'light' })

  await check('cold article load hydrates lazy equations', async () => {
    const context = await page.context().browser().newContext()
    try {
      const cold = await context.newPage()
      const errors = []
      cold.on('pageerror', error => errors.push(error.message))
      await cold.goto(origin + '/fixture-post', { waitUntil: 'domcontentloaded' })
      await cold.locator('.notion-equation .katex').first().waitFor()
      await cold.locator('.notion svg[id^="mermaid"] .node').first().waitFor()
      await cold.locator('details summary').click()
      assert(await cold.getByText('Fixture toggle child', { exact: true }).isVisible(), 'Cold article toggle failed')
      assert(!errors.length, `Cold article runtime errors: ${JSON.stringify(errors)}`)
    } finally {
      await context.close()
    }
  })

  await check('home and pagination', async () => {
    await visit('/')
    assert(JSON.stringify(await titles()) === JSON.stringify(expectedTitles.slice(0, 7)), 'First page must contain posts 1–7 in order')
    await screenshot('home')
    report.metrics.home = await page.evaluate(() => ({
      navigation: performance.getEntriesByType('navigation')[0]?.toJSON(),
      resources: performance.getEntriesByType('resource').map(({ name, transferSize, encodedBodySize, duration }) => ({ name, transferSize, encodedBodySize, duration }))
    }))
    await page.locator('button[rel="next"]').click()
    await page.waitForURL('**/page/2')
    await page.getByRole('heading', { name: 'Fixture Post 8', exact: true }).waitFor()
    assert(JSON.stringify(await titles()) === JSON.stringify(expectedTitles.slice(7)), 'Second page must contain posts 8–9')
    await page.locator('button[rel="prev"]').click()
    await page.waitForURL(origin + '/')
  })
  await check('search, empty results and tags', async () => {
    await visit('/search')
    const input = page.locator('main input[type="text"]')
    await input.fill('Fixture Post 3')
    assert(JSON.stringify(await titles()) === JSON.stringify(['Fixture Post 3']), 'Search must select post 3')
    await input.fill('this-query-has-no-fixture-match')
    assert((await titles()).length === 0, 'Unmatched query must have no article cards')
    await input.fill('')
    assert((await titles()).length === 9, 'Clearing search restores all posts')
    await page.locator('.tag-container a[href="/tag/Testing"]').click()
    await page.waitForURL('**/tag/Testing')
    assert((await titles()).length === 9, 'Testing tag must contain all nine posts')
  })
  await check('article content, toggle, heading and comments', async () => {
    await visit('/fixture-post')
    await page.locator('pre code.language-javascript .token').first().waitFor()
    assert((await page.locator('pre code.language-javascript').innerText()).includes('const fixtureAnswer = 42'), 'Code text missing')
    await page.locator('.notion svg[id^="mermaid"] .node').first().waitFor()
    assert((await page.locator('.notion svg[id^="mermaid"]').textContent()).includes('Fixture Start'), 'Diagram labels missing')
    await page.getByText('Fixture italic text', { exact: true }).waitFor()
    await page.locator('.notion-equation .katex').first().waitFor()
    assert(await page.locator('em').filter({ hasText: 'Fixture italic text' }).count() > 0, 'Italic semantic markup missing')
    await page.evaluate(() => document.fonts.ready)
    assert(await page.evaluate(() => document.fonts.check('italic 16px "IBM Plex Sans"')), 'Italic font did not load on demand')
    await page.getByRole('link', { name: 'Fixture Collection Row', exact: true }).waitFor()
    const toggle = page.locator('details').filter({ hasText: 'Fixture Toggle' })
    await toggle.locator('summary').click()
    assert(await toggle.getAttribute('open') !== null, 'Toggle did not open')
    assert(await toggle.getByText('Fixture toggle child', { exact: true }).isVisible(), 'Toggle child is hidden')
    await toggle.locator('summary').press('Enter')
    assert(await toggle.getAttribute('open') === null, 'Keyboard activation did not close the toggle')
    await toggle.locator('summary').press('Enter')
    await page.locator('[data-target-id="66666666-6666-6666-6666-666666666666"]').click()
    await page.waitForFunction(() => Math.abs(document.querySelector('.notion-block-66666666666666666666666666666666').getBoundingClientRect().top - 65) < 4)
    await page.getByRole('textbox', { name: '欢迎评论', exact: true }).waitFor()
    await screenshot('article')
    report.metrics.article = await page.evaluate(() => ({ resourceCount: performance.getEntriesByType('resource').length, transferBytes: performance.getEntriesByType('resource').reduce((sum, item) => sum + item.transferSize, 0) }))
  })
  await check('theme preserves code nodes and recolors Mermaid', async () => {
    await page.evaluate(() => {
      window.__e2eCodeNode = document.querySelector('pre code.language-javascript')
      window.__e2eMermaidFill = getComputedStyle(document.querySelector('.notion svg[id^="mermaid"] .node rect')).fill
    })
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForFunction(() => document.documentElement.classList.contains('dark'))
    await page.waitForFunction(() => {
      const rect = document.querySelector('.notion svg[id^="mermaid"] .node rect')
      return rect && getComputedStyle(rect).fill !== window.__e2eMermaidFill
    })
    assert(await page.evaluate(() => document.querySelector('pre code.language-javascript') === window.__e2eCodeNode), 'Dark theme remounted code')
    await screenshot('article-dark')
    await page.emulateMedia({ colorScheme: 'light' })
    await page.waitForFunction(() => !document.documentElement.classList.contains('dark'))
    await page.waitForFunction(() => {
      const rect = document.querySelector('.notion svg[id^="mermaid"] .node rect')
      return rect && getComputedStyle(rect).fill === window.__e2eMermaidFill
    })
    assert(await page.evaluate(() => document.querySelector('pre code.language-javascript') === window.__e2eCodeNode), 'Light theme remounted code')
  })
  await check('mobile navigation and article', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await visit('/')
    await page.locator('#sticky-nav').getByRole('link', { name: '关于', exact: true }).click()
    await page.waitForURL('**/about')
    await page.getByText('Fixture about page.', { exact: true }).waitFor()
    await visit('/fixture-post')
    await page.locator('.notion svg[id^="mermaid"] .node').first().waitFor()
    await page.locator('details summary').click()
    assert(await page.getByText('Fixture toggle child', { exact: true }).isVisible(), 'Mobile toggle failed')
    await screenshot('mobile')
    await page.setViewportSize({ width: 1280, height: 900 })
  })
  await check('talks, not found and degraded article', async () => {
    await visit('/talks')
    const cover = page.locator('a[href*="from-chat-to-agent"] img[src$="/talks/from-chat-to-agent.png"]')
    await cover.waitFor()
    await page.waitForFunction(() => [...document.images].some(image => image.src.endsWith('/talks/from-chat-to-agent.png') && image.complete && image.naturalWidth > 0))
    const missing = await visit('/e2e-page-that-does-not-exist')
    assert(missing.status() === 404, 'Unknown page must return HTTP 404')
    await page.getByRole('heading', { name: '404', exact: true }).waitFor()
    await visit('/fixture-post-9')
    await page.getByRole('heading', { name: 'Fixture Post 9', exact: true }).waitFor()
    await page.getByText('Content is temporarily unavailable for this post.', { exact: false }).waitFor()
  })
  await check('RSS order and failed body fallback', async () => {
    const response = await page.request.get(origin + '/feed')
    assert(response.ok(), 'RSS must return success')
    const entries = await page.evaluate(xml => {
      const document = new DOMParser().parseFromString(xml, 'application/xml')
      return [...document.querySelectorAll('entry')].map(entry => ({ title: entry.querySelector('title')?.textContent, summary: entry.querySelector('summary')?.textContent, content: entry.querySelector('content')?.textContent || '' }))
    }, await response.text())
    assert(JSON.stringify(entries.map(entry => entry.title)) === JSON.stringify(expectedTitles), 'RSS entries changed order or count')
    assert(entries[0].content.includes('Fixture body copy') && entries[0].content.includes('Fixture Collection Row') && entries[0].content.includes('Fixture toggle child'), 'RSS lost article body, nested collection or toggle content')
    assert(entries[8].summary === 'Fixture summary 9.' && entries[8].content === '', 'Failed article must retain summary and empty body')
  })
  await check('image optimizer accepts local assets and denies remote URLs', async () => {
    report.metrics.images = []
    for (const source of ['/favicon.png', '/talks/from-chat-to-agent.png']) {
      const response = await page.request.get(`${origin}/_next/image?url=${encodeURIComponent(source)}&w=64&q=75`)
      const contentType = response.headers()['content-type'] || ''
      const bytes = (await response.body()).length
      report.metrics.images.push({ source, status: response.status(), contentType, bytes })
      assert(response.ok(), `Local optimizer rejected ${source}: ${response.status()}`)
      assert(contentType.startsWith('image/') && bytes > 0, `Optimizer did not return image bytes for ${source}`)
    }
    // The absolute URL is deliberately outside remotePatterns, but still local.
    const source = `${origin}/favicon.png?e2e-forbidden-remote=1`
    const response = await page.request.get(`${origin}/_next/image?url=${encodeURIComponent(source)}&w=64&q=75`)
    const reason = await response.text()
    report.metrics.images.push({ source, status: response.status(), reason })
    assert(response.status() === 400 && /not allowed/i.test(reason), 'Forbidden remote image must be rejected by host validation')
  })
  await check('Mermaid and JSON-LD reject executable content and retain fallbacks', async () => {
    const malformedSource = 'graph TD\n  BROKEN[Unclosed security fixture'
    const metadataSource = '</script><script>window.__e2eMetadataExecuted=true</script>'
    await page.addInitScript(() => {
      window.__e2eMermaidExecuted = false
      window.__e2eMetadataExecuted = false
      window.__e2eSecurityRejections = []
      window.e2eMermaidCallback = () => { window.__e2eMermaidExecuted = true }
      window.addEventListener('unhandledrejection', event => { window.__e2eSecurityRejections.push(String(event.reason)) })
    })
    await visit('/fixture-post-8')
    const unsafeDiagram = page.locator('.notion svg[id^="mermaid-aaaaaaaa-aaaa-aaaa-aaaa-000000000802-"]')
    const healthyDiagram = page.locator('.notion svg[id^="mermaid-aaaaaaaa-aaaa-aaaa-aaaa-000000000804-"]')
    const fallback = page.getByRole('status').filter({ hasText: 'Diagram could not be rendered.' })
    const assertSafeRendering = async () => {
      await unsafeDiagram.locator('.node').first().waitFor()
      await healthyDiagram.locator('.node').first().waitFor()
      await page.locator('svg[id^="mermaid-aaaaaaaa-aaaa-aaaa-aaaa-000000000805-"] .katex').first().waitFor()
      await fallback.waitFor()
      assert((await fallback.locator('pre').innerText()) === malformedSource, 'Malformed diagram must preserve exact source')
      assert(await fallback.locator('svg').count() === 0, 'Fallback retained stale diagram SVG')
      assert(await page.locator('svg[id^="mermaid-aaaaaaaa-aaaa-aaaa-aaaa-000000000803-"]').count() === 0, 'Malformed diagram left an SVG outside its fallback')
      assert((await healthyDiagram.textContent()).includes('Security healthy start'), 'Malformed diagram blocked the healthy sibling')
      const dangerousDOM = await unsafeDiagram.evaluate(svg => [...svg.querySelectorAll('*')].flatMap(element =>
        [...element.attributes].filter(attribute => /^on/i.test(attribute.name) || /^(?:href|xlink:href|src)$/i.test(attribute.name) && /^\s*javascript:/i.test(attribute.value)).map(attribute => `${element.tagName}:${attribute.name}`)
      ))
      assert(!dangerousDOM.length, `Mermaid retained executable attributes: ${dangerousDOM.join(', ')}`)
      assert(await unsafeDiagram.locator('script').count() === 0, 'Mermaid retained a script element')
      for (const node of await unsafeDiagram.locator('.node').all()) await node.click()
      assert(page.url() === `${origin}/fixture-post-8`, 'Unsafe diagram link navigated away')
      const execution = await page.evaluate(() => ({ mermaid: window.__e2eMermaidExecuted, metadata: window.__e2eMetadataExecuted, rejections: window.__e2eSecurityRejections }))
      assert(!execution.mermaid && !execution.metadata, 'Untrusted diagram or metadata executed JavaScript')
      assert(!execution.rejections.length, `Unhandled diagram rejection: ${JSON.stringify(execution.rejections)}`)
    }
    await assertSafeRendering()
    const metadata = await page.locator('script[type="application/ld+json"]').allTextContents()
    assert(metadata.some(value => JSON.parse(value).description === metadataSource), 'Escaped JSON-LD must preserve the original description')
    assert(await page.locator('script').evaluateAll(scripts => !scripts.some(script => script.type !== 'application/ld+json' && script.textContent.trim() === 'window.__e2eMetadataExecuted=true')), 'JSON-LD injected an executable script element')
    const initialFill = await healthyDiagram.locator('.node rect').first().evaluate(rect => getComputedStyle(rect).fill)
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForFunction(fill => {
      const rect = document.querySelector('svg[id^="mermaid-aaaaaaaa-aaaa-aaaa-aaaa-000000000804-"] .node rect')
      return document.documentElement.classList.contains('dark') && rect && getComputedStyle(rect).fill !== fill
    }, initialFill)
    await assertSafeRendering()
    await page.emulateMedia({ colorScheme: 'light' })
    await page.waitForFunction(fill => {
      const rect = document.querySelector('svg[id^="mermaid-aaaaaaaa-aaaa-aaaa-aaaa-000000000804-"] .node rect')
      return !document.documentElement.classList.contains('dark') && rect && getComputedStyle(rect).fill === fill
    }, initialFill)
    await assertSafeRendering()
    await screenshot('security')
  })
  page.off('pageerror', onError)
  page.off('console', onConsole)
  page.off('requestfailed', onFailure)
  await check('browser runtime and local requests', async () => {
    assert(!report.pageErrors.length, JSON.stringify(report.pageErrors))
    assert(!report.localFailures.length, JSON.stringify(report.localFailures))
    assert(!report.consoleErrors.some(message => /hydration|hydrating|Minified React error/i.test(message)), 'React hydration error')
  })
  return { ...report, passed: report.checks.filter(check => check.passed).length, failed: report.checks.filter(check => !check.passed) }
}
