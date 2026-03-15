import React from 'react'
import Link from 'next/link'

const TagItem = ({ tag }) => (
  <Link href={`/tag/${encodeURIComponent(tag)}`}>
    <p className="mr-2 text-sm leading-6">
      #{tag}
    </p>
  </Link>
)

export default React.memo(TagItem)
