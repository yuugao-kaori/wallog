import { TagcloudServer } from '@/components/TagcloudServer';
import { HomeClient } from './HomeClient';

export default async function Home() {
  const postListResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/post/post_list?random=true&limit=10`);
  const randomPosts = await postListResponse.json();

  const { tags } = await TagcloudServer();
  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_DOMAIN}/api/blog/blog_list`);
  const { blogs, total } = await response.json();

  return <HomeClient randomPosts={randomPosts} blogs={blogs} total={total} />;
}
