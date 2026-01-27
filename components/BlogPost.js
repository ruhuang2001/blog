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
          <div className="flex-shrink-0 text-gray-400 dark:text-gray-500 text-sm flex items-center">
            <time className="flex items-center">
              <FormattedDate date={post.date} />
            </time>
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
