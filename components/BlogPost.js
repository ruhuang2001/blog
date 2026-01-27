import React from 'react'
import FormattedDate from "@/components/FormattedDate";
import { useConfig } from "@/lib/config";
import Link from "next/link";

const BlogPost = ({ post }) => {
  const BLOG = useConfig();

  return (
    <Link href={`${BLOG.path}/${post.slug}`}>
      <article key={post.id} className="mb-6 md:mb-8 group">
        <header className="flex flex-col justify-between md:flex-row md:items-baseline">
          <h2 className="text-lg md:text-xl font-medium mb-2 cursor-pointer text-black dark:text-gray-100 group-hover:text-blue-500 transition-colors">
            {post.title}
          </h2>
          <div className="flex-shrink-0 text-gray-400 dark:text-gray-500 text-sm flex items-center space-x-2">
            <time className="flex items-center">
              <FormattedDate date={post.date} />
            </time>
            {BLOG.comment?.provider === 'waline' && BLOG.comment?.walineConfig?.pageview && (
              <>
                <span className="opacity-30">|</span>
                <span className="flex items-center space-x-1">
                  <svg
                    className="h-3.5 w-3.5 opacity-60"
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
                  <span className="waline-pageview-count font-mono" data-path={`${BLOG.path}/${post.slug}`}>...</span>
                </span>
              </>
            )}
          </div>
        </header>
        <main>
          <p className="hidden md:block leading-8 text-gray-700 dark:text-gray-300">
            {post.summary}
          </p>
        </main>
      </article>
    </Link>
  );
};

export default React.memo(BlogPost);
