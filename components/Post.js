import PropTypes from 'prop-types'
import cn from 'classnames'
import Image from 'next/image'
import { useConfig } from '@/lib/config'
import useTheme from '@/lib/theme'
import FormattedDate from '@/components/FormattedDate'
import TagItem from '@/components/TagItem'
import NotionRenderer from '@/components/NotionRenderer'
import TableOfContents from '@/components/TableOfContents'

/**
 * A post renderer
 *
 * @param {PostProps} props
 *
 * @typedef {object} PostProps
 * @prop {object}   post       - Post metadata
 * @prop {?object}  blockMap   - Post block data
 * @prop {string}   emailHash  - Author email hash (for Gravatar)
 * @prop {boolean} [fullWidth] - Whether in full-width mode
 * @prop {string}  [contentState] - Content rendering state
 */
export default function Post (props) {
  const BLOG = useConfig()
  const { post, blockMap, emailHash, fullWidth = false, contentState = 'ready' } = props
  const { dark } = useTheme()
  const canRenderContent = contentState === 'ready' && blockMap?.block && Object.keys(blockMap.block).length > 0

  return (
    <article className={cn('flex flex-col', fullWidth ? 'md:px-24' : 'items-center')}>
      <h1 className={cn(
        'w-full font-bold text-3xl text-black dark:text-white',
        { 'max-w-2xl px-4': !fullWidth }
      )}>
        {post.title}
      </h1>
      {post.type[0] !== 'Page' && (
        <nav className={cn(
          'w-full flex flex-wrap items-center gap-y-2 mt-7 text-gray-500 dark:text-gray-400',
          { 'max-w-2xl px-4': !fullWidth }
        )}>
          <div className="flex items-center mb-2 text-sm leading-6">
            <a href={BLOG.socialLink || '#'} className="flex items-center hover:text-black dark:hover:text-gray-100 transition-colors">
              <Image
                alt={BLOG.author}
                width={24}
                height={24}
                src={`https://gravatar.com/avatar/${emailHash}`}
                className="h-6 w-6 rounded-full"
              />
              <p className="ml-2 md:block">{BLOG.author}</p>
            </a>
            <span className="block">&nbsp;/&nbsp;</span>
          </div>
          <div className="mr-3 mb-2 md:ml-0 text-sm leading-6">
            <FormattedDate date={post.date} />
          </div>
          {post.tags && (
            <div className="flex flex-nowrap items-center max-w-full overflow-x-auto article-tags mb-2">
              {post.tags.map(tag => (
                <TagItem key={tag} tag={tag} />
              ))}
            </div>
          )}
        </nav>
      )}
      <div className="self-stretch -mt-4 flex flex-col items-center lg:flex-row lg:items-stretch">
        {!fullWidth && <div className="flex-1 hidden lg:block" />}
        <div className={fullWidth ? 'flex-1 pr-4' : 'flex-none w-full max-w-2xl px-4'}>
          {canRenderContent
            ? (
              <NotionRenderer recordMap={blockMap} fullPage={false} darkMode={dark} />
              )
            : (
              <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                Content is temporarily unavailable for this post. Metadata is still available and the page will recover on the next successful regeneration.
              </div>
              )}
        </div>
        <div className={cn('order-first lg:order-[unset] w-full lg:w-auto max-w-2xl lg:max-w-[unset] lg:min-w-[160px]', fullWidth ? 'flex-none' : 'flex-1')}>
          {/* `65px` is the height of expanded nav */}
          {/* TODO: Remove the magic number */}
          {canRenderContent && (
            <TableOfContents blockMap={blockMap} className="pt-3 sticky" style={{ top: '65px' }} />
          )}
        </div>
      </div>
    </article>
  )
}

Post.propTypes = {
  post: PropTypes.object.isRequired,
  blockMap: PropTypes.object,
  emailHash: PropTypes.string.isRequired,
  fullWidth: PropTypes.bool,
  contentState: PropTypes.string
}
