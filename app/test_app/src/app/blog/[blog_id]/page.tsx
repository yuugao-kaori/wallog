'use client';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'; // useCallback を追加
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import BlogFormPopup from '@/components/Blogformpopup';
import axios from 'axios';
import remarkBreaks from 'remark-breaks';
import { parse } from 'papaparse';
import { visit } from 'unist-util-visit';
import rehypeRaw from 'rehype-raw'; // 追加
import remarkGfm from 'remark-gfm'; // 追加

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

// TableOfContentsItem インターフェースを追加
interface TableOfContentsItem {
  id: string;
  level: number;
  text: string;
}

export default function BlogDetail() {
  const params = useParams();
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);
  const [editData, setEditData] = useState<BlogPost | null>(null);
  const [toc, setToc] = useState<TableOfContentsItem[]>([]); // 目次の状態を追加

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
        // ブログデータがロードされたらタイトルを更新
        document.title = `${data.blog_title} | Wallog`;
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

  // カスタム画像タグを検出してHTMLノードとして挿入するremarkプラグインに修正
  function remarkCustomImg() {
    return (tree: any) => {
      visit(tree, 'text', (node: any, index: number | undefined, parent: any) => {
        const regex = /<img=([\w.-]+)>/g;
        let match;
        let lastIndex = 0;
        const newNodes: any[] = [];

        while ((match = regex.exec(node.value)) !== null) {
          const [fullMatch, filename] = match;
          const imageUrl = `/api/drive/file/${filename}`;

          // テキストの前半部分を追加
          if (match.index > lastIndex) {
            newNodes.push({
              type: 'text',
              value: node.value.substring(lastIndex, match.index),
            });
          }

          // HTMLノードとして<img>タグを追加
          newNodes.push({
            type: 'html',
            value: `<img src="${imageUrl}" alt="${filename}" />`,
          });

          lastIndex = regex.lastIndex;
        }

        // テキストの後半部分を追加
        if (lastIndex < node.value.length) {
          newNodes.push({
            type: 'text',
            value: node.value.substring(lastIndex),
          });
        }

        // 新しいノードを親に挿入
        if (newNodes.length > 0) {
          parent.children.splice(index, 1, ...newNodes);
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

  // generateId 関数を追加
  const generateId = useCallback((text: string): string => {
    if (!text) return '';
    const normalized = text.normalize('NFKD');
    let baseId = normalized
      .replace(/[^\w\s\-]/g, '')
      .replace(/[\s\u3000]+/g, '-')
      .replace(/[^\w\-]/g, '')
      .toLowerCase()
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!baseId || baseId === '-') {
      baseId = `heading-${Buffer.from(text).toString('base64').substring(0, 8)}`;
    }

    return baseId;
  }, []);

  // 目次を生成する関数を追加
  const generateToc = useCallback((markdownText: string) => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const newToc: TableOfContentsItem[] = [];
    let match;

    while ((match = headingRegex.exec(markdownText)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = generateId(text);
      newToc.push({ id, level, text });
    }
    
    setToc(newToc);
  }, [generateId]);

  // ReactMarkdown のコンポーネント設定を更新
  const markdownComponents = useMemo(() => ({
    h1: ({children, ...props}: React.HTMLProps<HTMLHeadingElement>) => {
      const id = generateId(String(children));
      return <h1 id={id} style={{ scrollMarginTop: '80px' }} className="text-3xl font-bold mt-6 mb-4" {...props}>{children}</h1>;
    },
    h2: ({children, ...props}: React.HTMLProps<HTMLHeadingElement>) => {
      const id = generateId(String(children));
      return <h2 id={id} style={{ scrollMarginTop: '80px' }} className="text-2xl font-bold mt-5 mb-3" {...props}>{children}</h2>;
    },
    h3: ({children, ...props}: React.HTMLProps<HTMLHeadingElement>) => {
      const id = generateId(String(children));
      return <h3 id={id} style={{ scrollMarginTop: '80px' }} className="text-xl font-bold mt-4 mb-2" {...props}>{children}</h3>;
    },
    h4: ({children, ...props}: React.HTMLProps<HTMLHeadingElement>) => {
      const id = generateId(String(children));
      return <h4 id={id} style={{ scrollMarginTop: '80px' }} className="text-lg font-bold mt-3 mb-2" {...props}>{children}</h4>;
    },
    h5: ({children, ...props}: React.HTMLProps<HTMLHeadingElement>) => {
      const id = generateId(String(children));
      return <h5 id={id} style={{ scrollMarginTop: '80px' }} className="text-base font-bold mt-2 mb-1" {...props}>{children}</h5>;
    },
    h6: ({children, ...props}: React.HTMLProps<HTMLHeadingElement>) => {
      const id = generateId(String(children));
      return <h6 id={id} style={{ scrollMarginTop: '80px' }} className="text-sm font-bold mt-2 mb-1" {...props}>{children}</h6>;
    },
    // リスト関連のコンポーネントを修正
    ul: ({children, ...props}: React.DetailedHTMLProps<React.HTMLAttributes<HTMLUListElement>, HTMLUListElement>) => (
      <ul className="list-disc list-inside my-4" {...props}>{children}</ul>
    ),
    ol: ({children, ...props}: React.DetailedHTMLProps<React.OlHTMLAttributes<HTMLOListElement>, HTMLOListElement>) => (
      <ol className="list-decimal list-inside my-4" {...props}>{children}</ol>
    ),
    // 引用のコンポーネントを追加
    blockquote: ({children, ...props}: React.HTMLProps<HTMLQuoteElement>) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 my-4 italic" {...props}>{children}</blockquote>
    ),
    // インラインコードのコンポーネントを追加
    code: ({inline, className, children, ...props}: any) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        // コードブロック用
        <div className="not-prose">
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      ) : (
        // インラインコード用
        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded" {...props}>
          {children}
        </code>
      );
    },
    // preタグをカスタマイズ
    pre: ({children, ...props}: React.HTMLProps<HTMLPreElement>) => (
      <div className="not-prose">
        <pre {...props}>{children}</pre>
      </div>
    ),
    // 水平線のコンポーネントを追加
    hr: () => <hr className="my-8 border-t border-gray-300 dark:border-gray-700" />,
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <strong {...props}>{children}</strong>, // strong を太字に戻す
    a: ({children, ...props}: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a
        {...props}
        className="text-blue-500 underline"
      >
        {children}
      </a>
    ),
  }), [generateId]);

  // ブログデータ取得後に目次を生成
  useEffect(() => {
    if (blog?.blog_text) {
      generateToc(blog.blog_text);
    }
  }, [blog?.blog_text, generateToc]);

  // 目次クリック時のスクロール処理を追加
  const handleTocClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (!id) return;
    
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80; // ヘッダーの高さに応じて調整
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // remarkUnderline 関数を修正して、++テキスト++ を下線に変換
  function remarkUnderline() {
    return (tree: any) => {
      visit(tree, 'text', (node: any, index: number | undefined, parent: any) => {
        const regex = /\+\+(.*?)\+\+/g; // __ から ++ に変更
        let match;
        let lastIndex = 0;
        const newNodes: any[] = [];

        while ((match = regex.exec(node.value)) !== null) {
          if (match.index > lastIndex) {
            newNodes.push({
              type: 'text',
              value: node.value.substring(lastIndex, match.index),
            });
          }
          newNodes.push({
            type: 'html',
            value: `<u>${match[1]}</u>`,
          });
          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < node.value.length) {
          newNodes.push({
            type: 'text',
            value: node.value.substring(lastIndex),
          });
        }

        if (newNodes.length > 0) {
          parent.children.splice(index, 1, ...newNodes);
        }
      });
    };
  }

  if (loading) return <div className="ml-48 p-4">Loading...</div>;
  if (error) return <div className="ml-48 p-4 text-red-500">{error}</div>;
  if (!blog) return <div className="ml-48 p-4">ブログが見つかりません</div>;

  return (
    <div className="p-4 md:ml-48 lg:mr-48 relative min-h-screen flex">
      {/* 記事本文のコンテナ */}
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
            remarkPlugins={[remarkUnderline, remarkGfm, remarkBreaks, remarkCsv, remarkCustomImg]} // remarkUnderline を最初に適用
            rehypePlugins={[rehypeRaw]} // rehypeStringify を削除
            components={markdownComponents}
          >
            {blog.blog_text}
          </ReactMarkdown>
        </div>
      </article>

      {/* 目次サイドバーを追加 */}
      <div className="hidden lg:block fixed right-0 top-0 bottom-0 w-48 bg-white dark:bg-neutral-900 shadow-lg border-l border-gray-200 dark:border-gray-700">
        <div className="sticky top-1/2 transform -translate-y-1/2 p-4 max-h-[60vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4 dark:text-white">目次</h2>
          <nav className="space-y-2">
            {toc.map((item, index) => (
              <a
                key={index}
                href={`#${item.id}`}
                onClick={(e) => handleTocClick(e, item.id)}
                className={`
                  block text-gray-600 dark:text-gray-400 hover:text-blue-500 
                  transition-colors duration-200 cursor-pointer
                  ${item.level === 1 ? 'ml-0' : `ml-${(item.level - 1) * 2}`}
                `}
              >
                {item.text}
              </a>
            ))}
          </nav>
        </div>
      </div>

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
        blogData={editData ? {
          ...editData, 
          blog_id: String(editData.blog_id)
        } : {
          blog_title: '',
          blog_text: '',
          blog_file: '',
          blog_thumbnail: '',
          blog_id: ''
        }}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        mode="edit"
      />
    </div>
  );
}
