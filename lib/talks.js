const TALKS_SOURCE_URL = 'https://ruhuang2001.github.io/'

const normalizeDate = raw => {
  const trimmed = raw.trim()
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{2})$/)
  if (!match) return trimmed
  const year = 2000 + Number(match[1])
  return `${year}-${match[2]}-${match[3]}`
}

export const decodeHtml = value => (
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
)

export const extractTalksFromHtml = html => {
  const sectionMatch = html.match(/<section id="talks"[\s\S]*?<\/section>/)
  if (!sectionMatch) return []
  const section = sectionMatch[0]
  const itemRegex = /<div class="post-title"><a href="([^"]+)">([^<]+)<\/a><\/div>[\s\S]*?<div class="post-date">([^<]+)<\/div>/g
  const talks = []
  const seen = new Set()
  let match

  while ((match = itemRegex.exec(section)) !== null) {
    const url = new URL(match[1], TALKS_SOURCE_URL).toString()
    if (seen.has(url)) continue
    seen.add(url)
    talks.push({
      title: decodeHtml(match[2].trim()),
      url,
      date: normalizeDate(match[3])
    })
  }

  return talks
}
