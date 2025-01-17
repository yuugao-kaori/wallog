'use client';

import { useParams } from 'next/navigation';
import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import PostCard from '@/components/PostCard';

interface Post {
    post_id: string;
    post_text: string;
    post_file?: string | string[];
    post_createat: string;
    title?: string;
    created_at: string;
}

export default function PostDetail() {
    const params = useParams();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [post, setPost] = useState<Post | null>(null);

    const api = useMemo(() => axios.create({
        baseURL: 'https://wallog.seitendan.com',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          'Access-Control-Allow-Credentials': 'true'
        },
        withCredentials: true
    }), []);

    useEffect(() => {
        const fetchPost = async () => {
            if (!params.post_id || Array.isArray(params.post_id)) {
                setError('無効な投稿IDです');
                setLoading(false);
                return;
            }

            try {
                const response = await api.post('/api/post/post_read', {
                    post_id: params.post_id
                });
                setPost(response.data.readed_post); // APIのレスポンス構造に合わせて修正
            } catch (err) {
                setError('投稿の取得に失敗しました');
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
    }, [params.post_id, api]);

    return (
        <div className="md:ml-48">
            {loading ? (
                <p>Loading...</p>
            ) : error ? (
                <p>{error}</p>
            ) : post ? (
                <PostCard 
                    post={post} 
                    isLoggedIn={false}
                    handleDeleteClick={() => {}}
                    formatDate={(date) => new Date(date).toLocaleDateString()}
                    onDelete={async () => false}
                />
            ) : (
                <p>投稿が見つかりません</p>
            )}
        </div>
    );
}