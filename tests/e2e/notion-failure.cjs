const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { spawn, spawnSync } = require('node:child_process')
const { once } = require('node:events')
const { setTimeout: delay } = require('node:timers/promises')
const { createHash } = require('node:crypto')

process.chdir(path.resolve(__dirname, '../..'))
const out = path.resolve('output/playwright/failures')
fs.mkdirSync(out, { recursive: true })
const database = '11111111-1111-1111-1111-111111111111'
const collection = '22222222-2222-2222-2222-222222222222'
const post = '44444444-4444-4444-4444-444444444444'
const origin = 'http://127.0.0.1:3102'
const next = path.resolve('node_modules/next/dist/bin/next')
const report = { startedAt: new Date().toISOString(), checks: [], responses: [] }
let server
const unwrap = value => value?.value ? unwrap(value.value) : value
const env = fixture => ({ ...process.env, NOTION_API_USE_FIXTURES: '1', NOTION_API_FIXTURE_PATH: fixture, NOTION_PAGE_ID: database, VERCEL_ENV: 'production' })
function run (command, args, fixture, name) {
  const fd = fs.openSync(path.join(out, `${name}.log`), 'w')
  try { return spawnSync(command, args, { env: env(fixture), stdio: ['ignore', fd, fd], timeout: 240000 }) } finally { fs.closeSync(fd) }
}
async function stop () {
  if (!server) return
  const child = server
  server = null
  if (child.exitCode !== null || child.signalCode !== null) return
  const exited = once(child, 'exit')
  child.kill('SIGTERM')
  const timer = setTimeout(() => child.kill('SIGKILL'), 5000)
  try { await exited } finally { clearTimeout(timer) }
}
async function start (fixture, name) {
  await stop()
  const fd = fs.openSync(path.join(out, `${name}.log`), 'w')
  server = spawn(process.execPath, [next, 'start', '--port', '3102'], { env: env(fixture), stdio: ['ignore', fd, fd] })
  fs.closeSync(fd)
  for (let attempt = 0; attempt < 80; attempt++) {
    assert.equal(server.exitCode, null, 'Server exited before readiness')
    try { await fetch(origin + '/favicon.ico', { signal: AbortSignal.timeout(1000) }); return } catch { await delay(250) }
  }
  throw new Error('Server did not start')
}
async function request (route, phase) {
  const res = await fetch(origin + route, { signal: AbortSignal.timeout(30000) })
  const body = await res.text()
  report.responses.push({ phase, route, status: res.status, cacheControl: res.headers.get('cache-control'), sha256: createHash('sha256').update(body).digest('hex') })
  return { status: res.status, body, cache: res.headers.get('cache-control') }
}
async function check (name, action) {
  try { await action(); report.checks.push({ name, passed: true }); console.log(`PASS ${name}`) } catch (error) { report.checks.push({ name, passed: false, error: error.message }); throw error }
}
async function main () {
  const socket = require('node:net').createServer()
  await new Promise((resolve, reject) => { socket.once('error', reject); socket.listen(3102, resolve) })
  await new Promise(resolve => socket.close(resolve))
  assert.equal(spawnSync(process.execPath, ['tests/e2e/create-fixture.cjs']).status, 0)
  const healthy = JSON.parse(fs.readFileSync('output/playwright/notion-api.json', 'utf8'))
  function fixture (name, mutate) {
    const data = structuredClone(healthy)
    mutate(data)
    const file = path.join(out, `${name}.json`)
    fs.writeFileSync(file, JSON.stringify(data))
    return file
  }
  const good = fixture('healthy', () => {})
  const failed = fixture('missing-root', data => { delete data.pages[database] })
  await check('unavailable database rejects production build', async () => {
    const result = run('pnpm', ['exec', 'next', 'build'], failed, 'failed-build')
    assert.equal(result.error, undefined)
    assert.notEqual(result.status, 0)
    assert.match(fs.readFileSync(path.join(out, 'failed-build.log'), 'utf8'), /Missing Notion page fixture/)
  })
  assert.equal(run('pnpm', ['exec', 'next', 'build'], good, 'healthy-build').status, 0, 'Healthy build failed')
  const manifestPath = '.next/prerender-manifest.json'
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  for (const route of Object.values(manifest.routes)) {
    if (typeof route.initialRevalidateSeconds === 'number') route.initialRevalidateSeconds = 1
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest))
  const routes = ['/', '/search', '/tag/Testing', '/page/2', '/fixture-post']
  const baseline = {}
  await start(good, 'healthy-server')
  await check('healthy listing and article routes contain posts', async () => {
    for (const route of routes) {
      const res = await request(route, 'healthy')
      assert.equal(res.status, 200)
      assert.match(res.body, /Fixture Post/)
      baseline[route] = JSON.parse(res.body.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)[1]).props.pageProps
    }
  })
  await start(failed, 'outage-server')
  await check('ISR keeps all previously generated pages after upstream failure', async () => {
    await delay(1500)
    for (const route of routes) await request(route, 'trigger-failed-revalidation')
    await delay(1500)
    for (const route of routes) {
      const res = await request(route, 'stale-after-failure')
      assert.equal(res.status, 200)
      const props = JSON.parse(res.body.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)[1]).props.pageProps
      assert.deepEqual(props, baseline[route])
    }
  })
  async function unavailableFeed (phase) {
    const res = await request('/feed', phase)
    assert.equal(res.status, 503)
    assert.match(res.cache || '', /no-store/)
    assert.doesNotMatch(res.body, /<feed\b/)
  }
  await check('outage RSS fails without cache and unknown article is not a 404', async () => {
    await unavailableFeed('outage')
    assert.equal((await request('/unknown-during-outage', 'outage')).status, 500)
  })
  const malformed = {
    'missing-view': data => { unwrap(data.pages[database].block[database]).view_ids.push('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') },
    'malformed-reducer': data => { Object.values(data.collectionData)[0].result.reducerResults = {} },
    'missing-row': data => { delete Object.values(data.collectionData)[0].recordMap.block[post] },
    'missing-schema': data => { delete unwrap(data.pages[database].collection[collection]).schema }
  }
  for (const [name, mutate] of Object.entries(malformed)) {
    await start(fixture(name, mutate), `${name}-server`)
    await check(`${name} cannot publish a successful empty feed`, () => unavailableFeed(name))
  }
  const recovered = fixture('recovered', data => {
    for (const row of Object.values(Object.values(data.collectionData)[0].recordMap.block)) {
      const value = unwrap(row)
      if (value.properties?.title) value.properties.title = [[`Recovered ${value.properties.title[0][0]}`]]
    }
  })
  await start(recovered, 'recovered-server')
  await check('recovery updates ISR and RSS and restores legitimate 404', async () => {
    let body = ''
    for (let attempt = 0; attempt < 30; attempt++) {
      const res = await request('/', 'recovery')
      assert.equal(res.status, 200)
      body = res.body
      if (body.includes('Recovered Fixture Post')) break
      await delay(500)
    }
    assert.match(body, /Recovered Fixture Post/)
    const feed = await request('/feed', 'recovery')
    assert.equal(feed.status, 200)
    assert.match(feed.body, /Recovered Fixture Post/)
    assert.equal((await request('/unknown-during-outage', 'recovery')).status, 404)
  })
  const blankDraft = fixture('blank-draft', data => {
    const id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    const result = Object.values(data.collectionData)[0]
    result.result.reducerResults.collection_group_results.blockIds.push(id)
    result.recordMap.block[id] = { value: { id, type: 'page', parent_table: 'collection' } }
  })
  await start(blankDraft, 'blank-draft-server')
  await check('existing blank draft does not hide published posts', async () => {
    const feed = await request('/feed', 'blank-draft')
    assert.equal(feed.status, 200)
    assert.equal((feed.body.match(/<entry\b/g) || []).length, 9)
    assert.match(feed.body, /Fixture Post/)
  })
  const empty = fixture('empty', data => { Object.values(data.collectionData)[0].result.reducerResults.collection_group_results.blockIds = [] })
  await start(empty, 'empty-server')
  await check('valid explicit empty database returns successful empty feed', async () => {
    const feed = await request('/feed', 'empty')
    assert.equal(feed.status, 200)
    assert.match(feed.body, /<feed\b/)
    assert.doesNotMatch(feed.body, /<entry\b/)
  })
}
main().catch(error => { report.error = error.stack; console.error(error); process.exitCode = 1 }).finally(async () => {
  await stop()
  report.finishedAt = new Date().toISOString()
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n')
})
