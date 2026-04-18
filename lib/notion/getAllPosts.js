import { serverConfig as BLOG } from '@/lib/server/config'

import { idToUuid } from 'notion-utils'
import dayjs from 'dayjs'
import api from '@/lib/server/notion-api'
import getAllPageIds from './getAllPageIds'
import getPageProperties from './getPageProperties'
import filterPublishedPosts from './filterPublishedPosts'
import { normalizeRecordMap } from './adapter'

function normalizePageId (pageId) {
  const raw = String(pageId).trim()
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return raw.toLowerCase()
  }
  return idToUuid(raw)
}

/**
 * @param {{ includePages: boolean }} - false: posts only / true: include pages
 */
export async function getAllPosts ({ includePages = false }) {
  const rawPageId = process.env.NOTION_PAGE_ID
  if (!rawPageId) {
    console.error('Failed to fetch posts: NOTION_PAGE_ID is not set')
    return []
  }

  try {
    const id = normalizePageId(rawPageId)
    const response = normalizeRecordMap(await api.getPage(id, {
      fetchCollections: false,
      fetchMissingBlocks: false
    }))

    if (!Object.keys(response?.collection || {}).length || !Object.keys(response?.block || {}).length) {
      console.error(
        `Failed to fetch posts: invalid Notion response for page "${id}". ` +
        'Please verify NOTION_PAGE_ID points to a public Notion database (or set NOTION_ACCESS_TOKEN for private data).'
      )
      return []
    }

    const pageBlock = response.block?.[id]?.value
    const collectionId = pageBlock?.collection_id || Object.keys(response.collection)[0]
    const collection = response.collection?.[collectionId]?.value
    const viewIds = pageBlock?.view_ids || Object.keys(response.collection_view || {})

    if (!collectionId || !collection || !viewIds?.length) {
      console.error(`Failed to fetch posts: page "${id}" is missing collection metadata`) 
      return []
    }

    const collectionQuery = { [collectionId]: {} }
    let rawBlock = response.block
    for (const viewId of viewIds) {
      const collectionView = response.collection_view?.[viewId]?.value || {}
      const collectionData = await api.getCollectionData(collectionId, viewId, collectionView, {
        limit: 999
      })
      const normalizedCollectionData = normalizeRecordMap(collectionData?.recordMap)

      rawBlock = {
        ...rawBlock,
        ...(normalizedCollectionData?.block || {})
      }

      const reducerResults = collectionData?.result?.reducerResults
      if (reducerResults) {
        collectionQuery[collectionId][viewId] = reducerResults
      }
    }

    if (!Object.keys(collectionQuery[collectionId]).length) {
      console.error(`Failed to fetch posts: no collection query data for page "${id}"`)
      return []
    }

    const block = rawBlock
    const schema = collection?.schema
    const rawMetadata = pageBlock

    // Check Type
    if (
      rawMetadata?.type !== 'collection_view_page' &&
      rawMetadata?.type !== 'collection_view'
    ) {
      console.error(`Failed to fetch posts: page "${id}" is not a Notion database`)
      return []
    }

    // Construct Data
    const pageIds = getAllPageIds(collectionQuery)
    const data = []
    for (let i = 0; i < pageIds.length; i++) {
      const postId = pageIds[i]
      const properties = (await getPageProperties(postId, block, schema)) || {}
      if (!Object.keys(properties).length) continue

      // Add fullwidth to properties
      properties.fullWidth = block[postId]?.value?.format?.page_full_width ?? false
      // Convert date (with timezone) to unix milliseconds timestamp
      properties.date = (
        properties.date?.start_date
          ? dayjs.tz(properties.date?.start_date, BLOG.timezone)
          : dayjs(block[postId]?.value?.created_time)
      ).valueOf()

      data.push(properties)
    }

    // remove all the the items doesn't meet requirements
    const posts = filterPublishedPosts({ posts: data, includePages })

    // Sort by date
    if (BLOG.sortByDate) {
      posts.sort((a, b) => b.date - a.date)
    }
    return posts
  } catch (error) {
    console.error(`Failed to fetch posts for page "${rawPageId}":`, error)
    return []
  }
}
