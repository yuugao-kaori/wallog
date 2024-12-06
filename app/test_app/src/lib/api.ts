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

export interface HashtagRank {
  post_tag_id: string;
  post_tag_text: string;
  use_count: number;
}

export const getHashtagRanking = async (limit: number = 10): Promise<HashtagRank[]> => {
  try {
    const response = await fetch(`/api/hashtag/hashtag_rank?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch hashtag ranking');
    return await response.json();
  } catch (error) {
    console.error('Error fetching hashtag ranking:', error);
    return [];
  }
};