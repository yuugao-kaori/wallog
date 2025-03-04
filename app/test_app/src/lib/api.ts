import { FileItem } from '@/types';

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

export async function uploadFile(file: File): Promise<FileItem> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/drive/file_create', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Failed to upload file');
  }
  
  const data = await response.json();
  
  return {
    id: data.file_id,
    url: `/api/drive/file/${data.file_id}`,
    isImage: file.type.startsWith('image/'),
    contentType: file.type
  };
}

export async function deleteFile(fileId: string | number): Promise<boolean> {
  const response = await fetch(`/api/drive/file_delete`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ file_id: fileId })
  });
  
  return response.ok;
}

export async function getUserAutoHashtags(): Promise<string[]> {
  const response = await fetch('/api/user/user_read');
  if (!response.ok) {
    throw new Error('Failed to fetch user data');
  }
  const data = await response.json();
  return data.user_auto_hashtag || [];
}

export async function updateUserAutoHashtags(hashtags: string[]): Promise<boolean> {
  const response = await fetch('/api/user/user_update', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_auto_hashtag: hashtags
    })
  });
  
  return response.ok;
}