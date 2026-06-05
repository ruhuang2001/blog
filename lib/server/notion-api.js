import fs from 'fs'
import { resolve } from 'path'
import { NotionAPI } from 'notion-client'
import { idToUuid } from 'notion-utils'

const { NOTION_ACCESS_TOKEN, NOTION_API_FIXTURE_PATH, NOTION_API_USE_FIXTURES } = process.env

const client = new NotionAPI({ authToken: NOTION_ACCESS_TOKEN })

let fixturesCache

function shouldUseFixtures () {
  return NOTION_API_USE_FIXTURES === '1' || Boolean(NOTION_API_FIXTURE_PATH)
}

function normalizeId (value) {
  if (!value) return null
  const candidate = Array.isArray(value) ? (value[1] || value[0]) : value
  if (!candidate) return null
  const raw = String(candidate).trim()

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return raw.toLowerCase()
  }

  try {
    return idToUuid(raw)
  } catch {
    return raw
  }
}

function loadFixtures () {
  if (!fixturesCache) {
    const fixturePath = resolve(
      /* turbopackIgnore: true */ process.cwd(),
      NOTION_API_FIXTURE_PATH || 'tests/fixtures/notion-api.json'
    )
    fixturesCache = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
  }

  return fixturesCache
}

function getFixturePage (pageId) {
  const normalizedId = normalizeId(pageId)
  const fixture = loadFixtures().pages?.[normalizedId]

  if (!fixture) {
    throw new Error(`Missing Notion page fixture for "${normalizedId}"`)
  }

  return fixture
}

function getFixtureCollectionData (collectionId, viewId) {
  const collectionKey = normalizeId(collectionId)
  const viewKey = normalizeId(viewId)
  const fixture = loadFixtures().collectionData?.[`${collectionKey}:${viewKey}`]

  if (!fixture) {
    throw new Error(`Missing Notion collection fixture for "${collectionKey}:${viewKey}"`)
  }

  return fixture
}

function getFixtureUsers (userId) {
  const normalizedId = normalizeId(userId)
  return loadFixtures().users?.[normalizedId] || { recordMapWithRoles: { notion_user: {} } }
}

const api = {
  async getPage (pageId, ...args) {
    if (shouldUseFixtures()) {
      return getFixturePage(pageId)
    }

    return client.getPage(pageId, ...args)
  },

  async getCollectionData (collectionId, viewId, collectionView, ...args) {
    if (shouldUseFixtures()) {
      return getFixtureCollectionData(collectionId, viewId)
    }

    return client.getCollectionData(collectionId, viewId, collectionView, ...args)
  },

  async getUsers (userId) {
    if (shouldUseFixtures()) {
      return getFixtureUsers(userId)
    }

    const normalizedId = normalizeId(userId)
    return client.getUsers(normalizedId ? [normalizedId] : [])
  }
}

export default api
