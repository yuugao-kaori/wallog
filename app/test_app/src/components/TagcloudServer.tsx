
import { getTags, TagData } from '@/lib/api';

export async function TagcloudServer() {
  const tags = await getTags();
  return { tags };
}