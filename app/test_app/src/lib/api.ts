export interface TagData {
  post_tag_id: number;
  post_tag_text: string;
  use_count: number;
}

export async function getTags(): Promise<TagData[]> {
  const response = await fetch('https://wallog.seitendan.com/api/hashtag/hashtag_rank', {
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('Failed to fetch tags');
  return response.json();
}