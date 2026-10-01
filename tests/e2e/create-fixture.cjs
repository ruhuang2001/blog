const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '../..')
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/notion-api.json'), 'utf8'))
const mainId = '44444444-4444-4444-4444-444444444444'
const databaseId = '22222222-2222-2222-2222-222222222222'
const data = Object.values(fixture.collectionData)[0]
const ids = data.result.reducerResults.collection_group_results.blockIds
const id = number => `aaaaaaaa-aaaa-aaaa-aaaa-${String(number).padStart(12, '0')}`
const richText = text => [[text]]

for (let number = 2; number <= 9; number++) {
  const postId = id(number)
  const post = structuredClone(data.recordMap.block[mainId].value)
  post.id = postId
  post.created_time += number * 86400000
  post.properties.title = richText(`Fixture Post ${number}`)
  post.properties.slug = richText(`fixture-post-${number}`)
  post.properties.summary = richText(`Fixture summary ${number}.`)
  data.recordMap.block[postId] = { value: post }
  ids.push(postId)
  if (number === 9) continue // Deliberately exercise missing body recovery.
  const textId = id(100 + number)
  fixture.pages[postId] = { block: {
    [postId]: { value: { ...post, content: [textId] } },
    [textId]: { value: { id: textId, type: 'text', parent_id: postId, parent_table: 'block', properties: { title: richText(`Fixture body ${number}.`) } } }
  } }
}

const page = fixture.pages[mainId]
const parent = page.block[mainId].value.value
function addBlock (number, type, title, extra = {}) {
  const blockId = id(number)
  page.block[blockId] = { value: { id: blockId, type, parent_id: mainId, parent_table: 'block', properties: { title: richText(title) }, ...extra } }
  parent.content.push(blockId)
  return blockId
}
addBlock(201, 'code', 'const fixtureAnswer = 42;\nconsole.log(fixtureAnswer);', { properties: { title: richText('const fixtureAnswer = 42;\nconsole.log(fixtureAnswer);'), language: richText('JavaScript') } })
addBlock(202, 'code', '', { properties: { title: richText('graph TD\n  A[Fixture Start] --> B[Fixture End]'), language: richText('Mermaid') } })
addBlock(203, 'text', '', { properties: { title: [['Fixture italic text', [['i']]]] } })
const toggleId = addBlock(204, 'toggle', 'Fixture Toggle', { content: [id(205)] })
page.block[id(205)] = { value: { id: id(205), type: 'text', parent_id: toggleId, parent_table: 'block', properties: { title: richText('Fixture toggle child') } } }

const collectionId = id(301)
const viewId = id(302)
const rowId = id(303)
addBlock(300, 'collection_view', 'Fixture Database', { collection_id: collectionId, view_ids: [viewId] })
page.collection = {
  [databaseId]: structuredClone(fixture.pages['11111111-1111-1111-1111-111111111111'].collection[databaseId]),
  [collectionId]: { value: { id: collectionId, name: richText('Fixture Database'), schema: { title: { name: 'Name', type: 'title' } } } }
}
page.collection_view = { [viewId]: { value: { id: viewId, type: 'table', name: 'Fixture Table', format: { table_properties: [{ property: 'title', visible: true, width: 280 }] } } } }
page.collection_query = { [collectionId]: { [viewId]: { collection_group_results: { blockIds: [rowId] } } } }
page.block[rowId] = { value: { id: rowId, type: 'page', parent_id: collectionId, parent_table: 'collection', properties: { title: richText('Fixture Collection Row') } } }

const destination = path.join(root, 'output/playwright/notion-api.json')
fs.mkdirSync(path.dirname(destination), { recursive: true })
fs.writeFileSync(destination, JSON.stringify(fixture, null, 2) + '\n')
console.log(destination)
