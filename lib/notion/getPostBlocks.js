import api from '@/lib/server/notion-api'

function normalizeRecordValues (record = {}) {
  const normalized = {}
  for (const [key, entry] of Object.entries(record)) {
    const nextValue = entry?.value?.value ?? entry?.value ?? {}
    normalized[key] = {
      ...entry,
      value: nextValue
    }
  }
  return normalized
}

export async function getPostBlocks (id) {
  const recordMap = await api.getPage(id)
  return {
    ...recordMap,
    block: normalizeRecordValues(recordMap?.block),
    collection: normalizeRecordValues(recordMap?.collection),
    collection_view: normalizeRecordValues(recordMap?.collection_view),
    notion_user: normalizeRecordValues(recordMap?.notion_user)
  }
}
