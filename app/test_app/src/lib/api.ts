export interface TagData {
  post_tag_id: number;
  post_tag_text: string;
  use_count: number;
}

export async function getTags(): Promise<TagData[]> {
  try {
    const response = await fetch('https://wallog.seitendan.com/api/hashtag/hashtag_rank', {
      cache: 'no-store',
      credentials: 'include',  // Cookieを含める
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Credentials': 'true'
      }
    });

    if (!response.ok) {
      console.error('Tag fetch failed:', {
        status: response.status,
        statusText: response.statusText
      });
      // エラー時は空配列を返す
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];

  } catch (error) {
    console.error('Error fetching tags:', error);
    // エラー時は空配列を返す
    return [];
  }
}