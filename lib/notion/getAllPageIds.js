import { idToUuid } from 'notion-utils'

function getBlockIds (view = {}) {
  return view?.blockIds || view?.collection_group_results?.blockIds || []
}

function normalizeViewId (viewId) {
  if (!viewId) return viewId
  const raw = String(viewId).trim()
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return raw.toLowerCase()
  }
  return idToUuid(raw)
}

export default function getAllPageIds (collectionQuery, viewId) {
  if (!collectionQuery || typeof collectionQuery !== 'object') return []
  const views = Object.values(collectionQuery)[0]
  if (!views || typeof views !== 'object') return []
  let pageIds = []
  if (viewId) {
    const vId = normalizeViewId(viewId)
    pageIds = getBlockIds(views[vId])
  } else {
    const pageSet = new Set()
    Object.values(views).forEach(view => {
      getBlockIds(view).forEach(id => pageSet.add(id))
    })
    pageIds = [...pageSet]
  }
  return pageIds
}
