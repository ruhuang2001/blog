import api from '@/lib/server/notion-api'
import { normalizeRecordMap } from './adapter'

export async function getPostBlocks (id) {
  const recordMap = await api.getPage(id)
  return normalizeRecordMap(recordMap)
}
