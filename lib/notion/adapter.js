function unwrapValue (value) {
  if (!value || typeof value !== 'object') return value
  if (!('value' in value)) return value
  return unwrapValue(value.value)
}

export function normalizeRecordEntry (entry = {}) {
  if (!entry || typeof entry !== 'object') {
    return { value: {} }
  }

  const nextValue = unwrapValue(entry.value)

  return {
    ...entry,
    value: nextValue && typeof nextValue === 'object' ? nextValue : {}
  }
}

export function normalizeRecordValues (record = {}) {
  const normalized = {}

  for (const [key, entry] of Object.entries(record || {})) {
    normalized[key] = normalizeRecordEntry(entry)
  }

  return normalized
}

export function normalizeRecordMap (recordMap = {}) {
  if (!recordMap || typeof recordMap !== 'object') return {}

  return {
    ...recordMap,
    block: normalizeRecordValues(recordMap.block),
    collection: normalizeRecordValues(recordMap.collection),
    collection_view: normalizeRecordValues(recordMap.collection_view),
    notion_user: normalizeRecordValues(recordMap.notion_user)
  }
}

export function hasRenderableContent (recordMap, pageId) {
  const blockIds = Object.keys(recordMap?.block || {})
  if (!blockIds.length) return false
  if (!pageId) return true
  return Boolean(recordMap?.block?.[pageId]?.value)
}
