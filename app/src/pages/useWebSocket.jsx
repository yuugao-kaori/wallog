import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = (url) => {
  const [posts, setPosts] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const wsRef = useRef(null);
  const isLoadingMoreRef = useRef(false);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connection established');
      loadMorePosts();
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Received message:", message);

      if (isLoadingMoreRef.current) {
        if (Array.isArray(message)) {
          if (message.length === 0) {
            setHasMore(false);
          } else {
            setPosts((prevPosts) => {
              const updatedPosts = [...prevPosts, ...message];
              return updatedPosts.sort((a, b) => new Date(b.post_createat) - new Date(a.post_createat));
            });
            setOffset((prevOffset) => prevOffset + message.length);
            if (message.length < 6) {
              setHasMore(false);
            }
          }
        } else {
          console.error('loadMore response is not an array:', message);
        }
        isLoadingMoreRef.current = false;
        setLoading(false);
      } else {
        if (Array.isArray(message) && message.length > 0) {
          setPosts((prevPosts) => {
            const updatedPosts = [...message, ...prevPosts];
            return updatedPosts.sort((a, b) => new Date(b.post_createat) - new Date(a.post_createat));
          });
        } else {
          console.error('New post notification is not an array:', message);
        }
      }
    };

    ws.onerror = (error) => console.error('WebSocket error:', error);
    ws.onclose = () => console.log('WebSocket connection closed');

    return ws;
  }, [url]);

  useEffect(() => {
    const ws = connect();
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [connect]);

  const loadMorePosts = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !loading && hasMore) {
      setLoading(true);
      isLoadingMoreRef.current = true;
      console.log("Sending request with offset:", offset);
      wsRef.current.send(JSON.stringify({ action: 'loadMore', offset, limit: 6 }));
    }
  }, [offset, loading, hasMore]);

  return { posts, setPosts, loading, hasMore, loadMorePosts };
};

export default useWebSocket;