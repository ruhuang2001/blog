import { getTextContent, getDateValue } from 'notion-utils'
import api from '@/lib/server/notion-api'
import { normalizeRecordValues } from './adapter'

const userCache = new Map()

async function getUserById (userId) {
  if (!userId) return null

  if (userCache.has(userId)) {
    return userCache.get(userId)
  }

  const userPromise = api.getUsers(userId)
    .then(res => {
      const notionUsers = normalizeRecordValues(res?.recordMapWithRoles?.notion_user)
      const resValue = notionUsers?.[userId]?.value

      if (!resValue) return null

      return {
        id: resValue.id,
        first_name: resValue.given_name,
        last_name: resValue.family_name,
        profile_photo: resValue.profile_photo
      }
    })
    .catch(error => {
      console.warn(`Failed to fetch user "${userId}":`, error.message)
      return null
    })

  userCache.set(userId, userPromise)
  return userPromise
}

async function getPageProperties (id, block, schema) {
  const rawProperties = Object.entries(block?.[id]?.value?.properties || [])
  const excludeProperties = ['date', 'select', 'multi_select', 'person']
  const properties = {}
  for (let i = 0; i < rawProperties.length; i++) {
    const [key, val] = rawProperties[i]
    properties.id = id
    if (schema[key]?.type && !excludeProperties.includes(schema[key].type)) {
      properties[schema[key].name] = getTextContent(val)
    } else {
      switch (schema[key]?.type) {
        case 'date': {
          const dateProperty = getDateValue(val)
          delete dateProperty.type
          properties[schema[key].name] = dateProperty
          break
        }
        case 'select':
        case 'multi_select': {
          const selects = getTextContent(val)
          if (selects[0]?.length) {
            properties[schema[key].name] = selects.split(',')
          }
          break
        }
        case 'person': {
          const rawUsers = val.flat()
          const users = []
          for (let i = 0; i < rawUsers.length; i++) {
            if (rawUsers[i][0][1]) {
              const user = await getUserById(rawUsers[i][0][1])
              if (user) users.push(user)
            }
          }
          properties[schema[key].name] = users
          break
        }
        default:
          break
      }
    }
  }
  return properties
}

export { getPageProperties as default }
