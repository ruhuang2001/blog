const rawServerConfig = require('../../blog.config.js')

const DEFAULT_REVALIDATE_SECONDS = 300

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function trimTrailingSlash (value) {
  if (typeof value !== 'string') return value
  return value.replace(/\/+$/, '')
}

const serverConfig = {
  ...rawServerConfig,
  link: trimTrailingSlash(rawServerConfig.link),
  ogImageGenerateURL: trimTrailingSlash(rawServerConfig.ogImageGenerateURL)
}

function pickPublicConfig(config) {
  const {
    title,
    author,
    link,
    description,
    lang,
    timezone,
    appearance,
    font,
    lightBackground,
    darkBackground,
    path,
    since,
    postsPerPage,
    sortByDate,
    showAbout,
    showArchive,
    autoCollapsedNavBar,
    ogImageGenerateURL,
    socialLink,
    seo,
    analytics,
    comment,
    isProd
  } = config

  return clone({
    title,
    author,
    link,
    description,
    lang,
    timezone,
    appearance,
    font,
    lightBackground,
    darkBackground,
    path,
    since,
    postsPerPage,
    sortByDate,
    showAbout,
    showArchive,
    autoCollapsedNavBar,
    ogImageGenerateURL,
    socialLink,
    seo,
    analytics,
    comment,
    isProd
  })
}

const publicConfig = Object.freeze(pickPublicConfig(serverConfig))

module.exports = {
  DEFAULT_REVALIDATE_SECONDS,
  serverConfig,
  publicConfig,
  config: serverConfig,
  clientConfig: publicConfig
}
