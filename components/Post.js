import PropTypes from 'prop-types'
import Image from 'next/image'
import cn from 'classnames'
import { useConfig } from '@/lib/config'
import { useLocale } from '@/lib/locale'
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
 * @prop {object}   blockMap   - Post block data
 * @prop {string}   emailHash  - Author email hash (for Gravatar)
 * @prop {boolean} [fullWidth] - Whether in full-width mode
 */
export default function Post (props) {
  const BLOG = useConfig()
  const locale = useLocale()
  const { post, blockMap, emailHash, fullWidth = false } = props
  const { dark } = useTheme()
  const showPageviews = Boolean(BLOG.comment?.provider === 'waline' && BLOG.comment?.walineConfig?.pageview)
  const viewLabel = locale?.POST?.VIEWS || '次阅读'
  const pageviewPath = post?.id || post?.slug

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
          'w-full flex mt-7 items-start text-gray-500 dark:text-gray-400',
          { 'max-w-2xl px-4': !fullWidth }
        )}>
          <div className="flex flex-wrap items-center gap-y-2 text-sm">
            <a href={BLOG.socialLink || '#'} className="flex items-center hover:text-black dark:hover:text-gray-100 transition-colors">
              <Image
                alt={BLOG.author}
                width={20}
                height={20}
                src={`https://gravatar.com/avatar/${emailHash}`}
                className="rounded-full"
              />
              <p className="ml-2 font-medium">{BLOG.author}</p>
            </a>
            <span className="mx-3 opacity-30">|</span>
            <div className="flex items-center">
              <FormattedDate date={post.date} />
            </div>
            {showPageviews && (
              <>
                <span className="mx-3 opacity-30">|</span>
                <div className="flex items-center">
                  <svg
                    className="mr-1.5 h-4 w-4 opacity-60"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12Z" />
                    <circle cx="12" cy="12" r="3.25" />
                  </svg>
                  <span
                    className="waline-pageview-count font-mono"
                    data-path={pageviewPath || undefined}
                  >
                    ...
                  </span>
                  <span className="ml-1 opacity-60">{viewLabel}</span>
                </div>
              </>
            )}
            {BLOG.comment?.provider === 'waline' && (
              <>
                <span className="mx-3 opacity-30">|</span>
                <div className="flex items-center">
                  <svg
                    className="mr-1.5 h-4 w-4 opacity-60"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span
                    className="waline-comment-count font-mono"
                    data-path={pageviewPath || undefined}
                  >
                    ...
                  </span>
                  <span className="ml-1 opacity-60">{locale?.COMMON?.COMMENTS || '条评论'}</span>
                </div>
              </>
            )}
          </div>
          {post.tags && (
            <div className="flex flex-nowrap max-w-full overflow-x-auto article-tags">
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
          <NotionRenderer recordMap={blockMap} fullPage={false} darkMode={dark} />
        </div>
        <div className={cn('order-first lg:order-[unset] w-full lg:w-auto max-w-2xl lg:max-w-[unset] lg:min-w-[160px]', fullWidth ? 'flex-none' : 'flex-1')}>
          {/* `65px` is the height of expanded nav */}
          {/* TODO: Remove the magic number */}
          <TableOfContents blockMap={blockMap} className="pt-3 sticky" style={{ top: '65px' }} />
        </div>
      </div>
    </article>
  )
}

Post.propTypes = {
  post: PropTypes.object.isRequired,
  blockMap: PropTypes.object.isRequired,
  emailHash: PropTypes.string.isRequired,
  fullWidth: PropTypes.bool
}
