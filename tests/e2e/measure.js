async (page) => {
  const base = new URL(page.url()).origin
  const context = await page.context().browser().newContext({ colorScheme: 'light' })
  context.setDefaultTimeout(15000)
  context.setDefaultNavigationTimeout(15000)
  const tab = await context.newPage()
  const pageErrors = []
  tab.on('pageerror', error => pageErrors.push(error.stack || error.message))
  try {
    await tab.goto(base, { waitUntil: 'domcontentloaded' })
    await tab.waitForFunction(() => document.fonts.check('16px "IBM Plex Sans"'))
    const home = await tab.evaluate(() => {
      const fonts = performance.getEntriesByType('resource')
        .filter(entry => new URL(entry.name).pathname.startsWith('/fonts/'))
        .map(entry => ({ path: new URL(entry.name).pathname, bytes: entry.encodedBodySize }))
      return { fonts, fontBytes: fonts.reduce((sum, font) => sum + font.bytes, 0) }
    })
    await tab.goto(`${base}/fixture-post`, { waitUntil: 'domcontentloaded' })
    await tab.locator('pre code .token').first().waitFor()
    await tab.locator('.notion svg[id^="mermaid-"]').waitFor()
    const code = await tab.locator('pre code').elementHandle()
    const svg = await tab.locator('.notion svg[id^="mermaid-"]').innerHTML()
    await tab.emulateMedia({ colorScheme: 'dark' })
    await tab.waitForFunction(() => document.documentElement.classList.contains('dark'))
    await tab.locator('pre code .token').first().waitFor()
    await tab.locator('.notion svg[id^="mermaid-"]').waitFor()
    const article = {
      codeNodeRetainedOnThemeChange: await code.evaluate(node => node.isConnected),
      mermaidThemeUpdated: svg !== await tab.locator('.notion svg[id^="mermaid-"]').innerHTML(),
      toggleCount: await tab.locator('details').count(),
      collectionRows: await tab.getByRole('link', { name: 'Fixture Collection Row', exact: true }).count()
    }
    return { home, article, pageErrors }
  } finally {
    await context.close()
  }
}
