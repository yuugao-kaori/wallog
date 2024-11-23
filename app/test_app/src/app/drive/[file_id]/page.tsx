'use client'

import { useState, use } from 'react'
import Image from 'next/image'

export default function Page({ params }: { params: Promise<{ file_id: string }> }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const { file_id } = use(params)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_DOMAIN?.replace(/\/+$/, '')
  const imageUrl = `${baseUrl}/api/drive/file/${file_id}`

  return (
    <div style={styles.container}>
      {loading && <p>読み込み中...</p>}
      {error && <p style={styles.error}>{error}</p>}
      <Image
        src={imageUrl}
        alt={`File ${file_id}`}
        width={1200}
        height={800}
        onLoadingComplete={() => setLoading(false)}
        onError={(e) => {
          setError('画像の読み込みに失敗しました。');
          (e.target as HTMLImageElement).style.display = 'none';
        }}
        style={styles.image}
        priority
      />
    </div>
  )
}

const styles = {
  container: {
    textAlign: 'center' as const,
    marginTop: '50px',
  },
  image: {
    maxWidth: '80%',
    height: 'auto',
  },
  error: {
    color: 'red',
  },
}