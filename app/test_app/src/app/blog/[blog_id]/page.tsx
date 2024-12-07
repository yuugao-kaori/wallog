'use client';
import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import BlogFormPopup from '@/components/Blogformpopup';
import axios from 'axios';
import remarkBreaks from 'remark-breaks';
import { parse } from 'papaparse';
import { visit } from 'unist-util-visit';
import rehypeRaw from 'rehype-raw'; // 追加

interface BlogPost {
  blog_id: number;
  blog_title: string;
  blog_text: string;
  blog_thumbnail: string;
  blog_createat: string;
  blog_updateat: string;
  blog_count: number;
  blog_file: string;
  blog_fixedurl: string;
}

interface ErrorResponse {
  error: string;
  message: string;
  status: number;
}

export default function BlogDetail() {
  const params = useParams();
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);
  const [editData, setEditData] = useState<BlogPost | null>(null);

  const api = useMemo(() => axios.create({
    baseURL: 'https://wallog.seitendan.com',
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'Access-Control-Allow-Credentials': 'true'
    },
    withCredentials: true
  }), []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await api.get('/api/user/login_check');
        setIsLoggedIn(response.status === 200);
      } catch (err) {
        setIsLoggedIn(false);
      }
    };
    checkSession();
  }, [api]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData || !params.blog_id) return;

    try {
      const response = await fetch(`/api/blog/blog_update/${params.blog_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
        credentials: 'include'
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Invalid content-type: ${contentType}. Response: ${text}`);
      }

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || '更新に失敗しました');
      
      // 更新成功後にブログデータを再取得
      const updatedBlogResponse = await fetch(`https://wallog.seitendan.com/api/blog/blog_read/${params.blog_id}`);
      const updatedBlogData = await updatedBlogResponse.json();
      if (updatedBlogResponse.ok) {
        setBlog(updatedBlogData);
      }
      
      setIsEditPopupOpen(false);
    } catch (error) {
      console.error('Error updating blog:', error);
    }
  };

  useEffect(() => {
    const fetchBlog = async () => {
      if (!params.blog_id || Array.isArray(params.blog_id)) {
        setError('無効なブログIDです');
        setLoading(false);
        return;
      }

      // blog_idの形式チェック
      if (!params.blog_id.startsWith('bl_')) {
        setError('無効なブログID形式です');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`https://wallog.seitendan.com/api/blog/blog_read/${params.blog_id}`);
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(`Invalid content-type: ${contentType}. Response: ${text}`);
        }
        
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'ブログの取得に失敗しました');
        }
        
        setBlog(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'ブログの取得に失敗しました';
        setError(errorMessage);
        console.error('Blog fetch error:', errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [params.blog_id]);

  // ポップアップを開く時に編集用データを初期化
  const handleEditClick = () => {
    setEditData(blog ? { ...blog } : null);
    setIsEditPopupOpen(true);
  };

  function remarkCsv() {
    return (tree: any) => {
      visit(tree, 'paragraph', (node: any) => {
        if (!node.children?.length) return;

        const fullText = node.children
          .map((child: any) => child.value || '')
          .join('\n'); // 改行を追加

        const regex = /<csv=([\s\S]*?)>/;
        const match = fullText.match(regex);

        if (match) {
          const csvContent = match[1].trim();
          
          try {
            // 改行を統一し、末尾の改行を確実に追加
            const normalizedContent = csvContent
              .replace(/\r\n/g, '\n')
              .replace(/\r/g, '\n')
              .trim();

            console.log('Normalized CSV:', normalizedContent);

            const results = parse(normalizedContent, { 
              header: true,
              skipEmptyLines: true,
              delimiter: ',',
              transformHeader: (header) => header.trim()
            });

            if (!results.meta || !results.data) {
              throw new Error('パースに失敗しました');
            }

            const parsed = results;

            // より詳細なデバッグ情報
            console.log('Parse Details:', {
              fields: parsed.meta.fields,
              dataLength: parsed.data.length,
              firstRow: parsed.data[0],
            });

            // デバッグ用ログを追加
            console.log('Parsed Fields:', parsed.meta.fields);
            console.log('Parsed Data:', parsed.data);

            if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
              throw new Error('ヘッダーが見つかりません');
            }

            // フィルタリングを緩和
            const validData = parsed.data; // フィルタを削除

            if (validData.length === 0) {
              throw new Error('有効なデータが見つかりません');
            }

            const tableHtml = generateTableHtml(parsed.meta.fields, validData as Record<string, string>[]);
            node.type = 'html';
            node.value = tableHtml;

          } catch (error) {
            console.error('CSV parsing details:', {
              originalContent: csvContent,
              error: error
            });
            
            node.type = 'paragraph';
            node.children = [{
              type: 'text',
              value: `CSV Parse Error: ${error instanceof Error ? error.message : 'パース失敗'}`
            }];
          }
        }
      });
    };
  }

  function generateTableHtml(headers: string[], rows: Record<string, string>[]) {
    const headerHtml = headers.map(header => `<th class="border border-gray-300 px-4 py-2 bg-gray-100 dark:bg-gray-700">${header}</th>`).join('');
    const rowsHtml = rows
      .map(row => 
        `<tr>${headers.map(header => 
          `<td class="border border-gray-300 px-4 py-2">${row[header] || ''}</td>`
        ).join('')}</tr>`
      )
      .join('');

    return `
      <div class="overflow-x-auto my-4">
        <table class="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr>${headerHtml}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  if (loading) return <div className="ml-48 p-4">Loading...</div>;
  if (error) return <div className="ml-48 p-4 text-red-500">{error}</div>;
  if (!blog) return <div className="ml-48 p-4">ブログが見つかりません</div>;

  return (
    <div className="p-4 md:ml-48 relative min-h-screen">
      <article className="max-w-4xl mx-auto bg-white dark:bg-neutral-900 rounded-xl p-8 shadow-lg">
        {blog.blog_thumbnail && (
          <img
            src={blog.blog_thumbnail}
            alt={blog.blog_title}
            className="w-full h-96 object-cover mb-8 rounded-lg"
          />
        )}
        <h1 className="text-4xl font-bold mb-6 dark:text-white">{blog.blog_title}</h1>
        <div className="flex justify-between items-center text-gray-600 dark:text-gray-400 mb-8">
          <div>
            <p>作成日: {new Date(blog.blog_createat).toLocaleDateString()}</p>
            <p>更新日: {new Date(blog.blog_updateat).toLocaleDateString()}</p>
          </div>
          <p>閲覧数: {blog.blog_count}</p>
        </div>
        <hr className="border-t border-gray-200 dark:border-gray-700 mb-8" />
        <div className="prose dark:prose-invert max-w-none mb-20">
          <ReactMarkdown
            remarkPlugins={[remarkBreaks, remarkCsv]}
            rehypePlugins={[rehypeRaw]} // 追加
            components={{
              h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-6 mb-4" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-5 mb-3" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-xl font-bold mt-4 mb-2" {...props} />,
              h4: ({node, ...props}) => <h4 className="text-lg font-bold mt-3 mb-2" {...props} />,
              h5: ({node, ...props}) => <h5 className="text-base font-bold mt-2 mb-1" {...props} />,
              h6: ({node, ...props}) => <h6 className="text-sm font-bold mt-2 mb-1" {...props} />,
              code({node, className, children, ...props}) {
                const match = /language-(\w+)/i.exec(className || '');
                if (match && match[1].toLowerCase() === 'csv') {
                  try {
                    const csvContent = String(children).trim();
                    const parsed = parse(csvContent, { 
                      header: true, 
                      skipEmptyLines: true,
                      transformHeader: header => header.trim()
                    });
                    
                    if (parsed.data.length === 0) return <pre>{children}</pre>;

                    return (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full border-collapse border border-gray-300">
                          <thead>
                            <tr>
                              {parsed.meta.fields?.map((header, i) => (
                                <th key={i} className="border border-gray-300 px-4 py-2 bg-gray-100 dark:bg-gray-700">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {parsed.data.map((row, rowIdx) => (
                              <tr key={rowIdx}>
                                {parsed.meta.fields?.map((field, colIdx) => (
                                  <td key={`${rowIdx}-${colIdx}`} className="border border-gray-300 px-4 py-2">
                                    {String((row as Record<string, unknown>)[field] || '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  } catch (error) {
                    console.error('CSV parsing error:', error);
                    return <pre>{children}</pre>;
                  }
                }
                return <code className={className} {...props}>{children}</code>;
              }
            }}
          >
            {blog.blog_text}
          </ReactMarkdown>
        </div>
      </article>

      {isLoggedIn && (
        <button
          onClick={handleEditClick}
          className="fixed bottom-8 right-8 px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 shadow-lg"
        >
          編集
        </button>
      )}

      <BlogFormPopup
        isOpen={isEditPopupOpen}
        onClose={() => setIsEditPopupOpen(false)}
        blogData={editData || { blog_title: '', blog_text: '', blog_file: '', blog_thumbnail: '' }}
        onInputChange={handleInputChange}        onSubmit={handleSubmit}        mode="edit"      />    </div>  );}