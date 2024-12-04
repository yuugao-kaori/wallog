
import sharp from 'sharp';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const searchParams = request.nextUrl.searchParams;
  const quality = parseInt(searchParams.get('quality') || '100', 10);

  try {
    // オリジナル画像の取得処理
    const originalImage = await fetchOriginalImage(params.id);
    
    // 画質の調整
    const processedImage = await sharp(originalImage)
      .jpeg({ quality: quality })
      .toBuffer();

    return new Response(processedImage, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    return new Response('Error processing image', { status: 500 });
  }
}