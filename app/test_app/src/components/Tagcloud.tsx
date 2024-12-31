'use client';

import { type TagData } from '@/lib/api';

interface Props {
  tags: TagData[];
}

async function getTags() {
  const response = await fetch('https://wallog.seitendan.com/api/hashtag/hashtag_rank', {
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('Failed to fetch tags');
  return response.json();
}

function Tagcloud({ tags }: Props) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 dark:text-white">タグクラウド</h2>
      <div className="flex flex-wrap gap-2 mb-6">
        {tags.map((tag) => {
          const fontSize = Math.min(0.7 + (tag.use_count / 20), 1.3);

          return (
            <a
              href={`https://wallog.seitendan.com/search?searchText=${tag.post_tag_id}&searchType=hashtag`}
              key={tag.post_tag_id}
              className="inline-block px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 
                       text-blue-800 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-800 
                       cursor-pointer transition-all duration-200 no-underline"
              style={{ fontSize: `${fontSize}rem` }}
            >
              {tag.post_tag_text}
              <span className="ml-1 text-l text-blue-600 dark:text-blue-300">
                {tag.use_count}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default Tagcloud;
