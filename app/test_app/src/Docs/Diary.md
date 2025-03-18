# Diary システム設計ドキュメント

## 1. 概要

Diaryシステムは、投稿の作成、表示、管理を行うコンポーネント群で構成されています。
主にユーザーの投稿、ファイル添付、ハッシュタグ管理、投稿修正などの機能を提供します。

## 2. コンポーネント構造

### 2.1 メインコンポーネント

- `Diary` (`/src/app/diary/page.tsx`)
  - アプリケーションのメインページ
  - 状態管理とAPI連携の中心
  - サブコンポーネントの統合と調整

### 2.2 投稿関連コンポーネント

- `PostForm` (`/src/components/PostForm.tsx`)
  - デスクトップ向け新規投稿フォーム
  - ファイルアップロード機能
  - ハッシュタグ管理
  
- `PostFormPopup` (`/src/components/PostFormPopup.tsx`)
  - モーダル形式の投稿フォーム
  - モバイル対応と投稿編集
  - 引用・返信・修正モードに対応

### 2.3 表示コンポーネント

- `PostFeed` (`/src/components/PostFeed.tsx`)
  - 投稿一覧の表示制御
  - 無限スクロール実装
  - SSEによるリアルタイム更新
  
- `PostCard` (`/src/components/PostCard.tsx`)
  - 個別投稿の表示と各種操作
  - 画像プレビューと展開機能
  - インタラクション機能（引用・返信・修正）

### 2.4 共通コンポーネント

- `FilePreview` (`/src/components/PostFormCommon.tsx`)
  - ファイルプレビュー表示
  - 画像/非画像ファイルの統一的な表示
  - 添付取り消し・削除機能

## 3. 共通機能（PostFormCommon）

投稿フォーム関連の共通機能を `PostFormCommon.tsx` で管理しています：

### 3.1 カスタムフック

```typescript
// ファイルアップロード管理
const {
  uploadProgress,       // アップロード進捗状態
  isUploading,          // アップロード中フラグ
  fileInputRef,         // ファイル入力要素への参照
  dropRef,              // ドロップエリア要素への参照
  handleDragOver,       // ドラッグオーバーハンドラ
  handleDragLeave,      // ドラッグリーブハンドラ
  handleDrop,           // ドロップハンドラ
  handleFilesWithProgress, // ファイル処理関数
  handlePaste,          // ペーストハンドラ
  uploadedFiles         // アップロード済みファイル一覧
} = useFileUpload(files, setFiles, onFileUploadComplete);

// ハッシュタグ管理
const {
  hashtagRanking,       // 人気ハッシュタグランキング
  isDropdownOpen,       // ドロップダウン表示状態
  setIsDropdownOpen,    // ドロップダウン状態変更関数
  selectedHashtags,     // 選択されたハッシュタグ
  setSelectedHashtags,  // 選択タグ変更関数
  isLoading,            // 読み込み中フラグ
  handleHashtagSelect,  // タグ選択ハンドラ
  fixedHashtags,        // 固定ハッシュタグ
  setFixedHashtags,     // 固定タグ変更関数
  autoAppendTags,       // タグ自動付与設定
  setAutoAppendTags,    // 自動付与設定変更関数
  processPostText,      // 投稿テキスト処理関数
  handleHashtagChange,  // ハッシュタグ入力変更ハンドラ
  refreshHashtags       // タグ情報更新関数
} = useHashtags(initialFixedTags, initialAutoAppend, autoInitializeSelected);
```

### 3.2 投稿テキスト処理

```typescript
// 投稿テキスト処理関数（ハッシュタグ追加処理）
const finalText = processPostText(
  postText,         // 入力された投稿テキスト
  selectedHashtags, // 選択済みのハッシュタグSet
  autoAppendTags,   // 自動付与設定（Boolean）
  fixedHashtags     // 固定ハッシュタグ（カンマ区切り文字列）
);
```

### 3.3 投稿モード

投稿フォームは以下の4つのモードで動作します：

- `normal`: 通常の新規投稿
- `quote`: 既存の投稿を引用する投稿
- `reply`: 既存の投稿への返信
- `correct`: 削除して再投稿するモード（投稿の修正用）

```typescript
// モードに応じた処理の使い分け例
if (mode === 'correct') {
  // 1. 元の投稿を削除
  await handleDelete(targetPost.post_id);
  
  // 2. 元の投稿の引用/返信関係を維持して再投稿
  const payload = {
    post_text: finalText,
    ...(files.length > 0 && { post_file: files.map(file => file.id) }),
    ...(originalRepostId && { repost_id: originalRepostId }),
    ...(originalReplyId && { reply_id: originalReplyId })
  };
  
  // 3. 新規投稿を作成
  await api.post('/api/post/post_create', payload);
} 
else if (mode === 'quote' || mode === 'reply') {
  // 引用・返信投稿の作成
  await handleQuoteSubmit(finalText, mode, targetPostId, files);
}
else {
  // 通常の新規投稿
  await api.post('/api/post/post_create', payload);
}
```

各モードの使用場面：

| モード | 使用場面 | 処理内容 |
|--------|---------|---------|
| normal | 通常の投稿作成時 | 新規投稿の作成 |
| quote | 他の投稿を引用する時 | 引用元の情報を含めた新規投稿 |
| reply | 他の投稿に返信する時 | 返信先の情報を含めた新規投稿 |
| correct | 投稿内容の修正が必要な時 | 既存投稿を削除し、元の関連性（引用/返信）を保持しつつ修正内容で再投稿 |

## 4. データフロー

### 4.1 投稿フロー
1. ユーザー入力
   - テキスト入力 → `setPostText` → 状態更新
   - ファイル添付 → `handleFilesWithProgress` → `onFileUploadComplete` → 親コンポーネントの `handleFiles`
   - タグ選択 → `handleHashtagSelect` → `selectedHashtags` 更新

2. 投稿処理
   - フォーム送信 → `handleFormSubmit`
   - テキスト処理 → `processPostText` → ハッシュタグ付与
   - API リクエスト → `/api/post/post_create`
   - 投稿一覧更新 → `setPosts([newPost, ...prevPosts])`

### 4.2 修正フロー（correctモード）
1. 修正ボタンクリック
   - `PostCard` の修正ボタン → `onCorrect` コールバック
   - `Diary` または親コンポーネントで `setRepostData(post)` と `setIsModalOpen(true)`

2. 修正処理
   - 元投稿を削除 → `handleDelete(post.post_id)`
   - 新規投稿作成 → `/api/post/post_create` に元の関連性を維持するパラメータを追加
   - 投稿一覧更新 → `setPosts([newPost, ...filteredPosts])`

### 4.3 表示更新
   - SSE接続 → `/api/post/post_sse` からリアルタイムデータ取得
   - 既存投稿と重複排除 → `existingIds` を使用した重複チェック
   - UI反映 → `PostCard` コンポーネントで各投稿を表示

## 5. ファイル処理システム

### 5.1 ファイルアップロードフロー
```
選択/ドロップ/ペースト → handleFilesWithProgress → API送信 → ファイルID取得 → ファイルリスト更新
```

1. ファイル選択方法
   - ドラッグ＆ドロップ: `handleDrop`
   - ファイル選択ダイアログ: `fileInputRef.current.click()`
   - クリップボードからペースト: `handlePaste`
   - 既存ファイル選択: `handleSelectExistingFiles`

2. アップロード処理
   - `handleFilesWithProgress`: 進捗表示付きでアップロード
   - FormDataを使用して `/api/drive/file_create` にPOSTリクエスト
   - アップロード進捗を `uploadProgress` 状態で管理

3. ファイルメタデータ管理
   ```typescript
   interface FileItem {
     id: string | number;      // ファイルID
     name?: string;            // ファイル名
     size?: number;            // ファイルサイズ
     contentType?: string;     // MIMEタイプ
     isImage: boolean;         // 画像かどうかのフラグ
     uploadProgress?: number;  // アップロード進捗（0-100）
     error?: string;           // エラーメッセージ
     isExisting?: boolean;     // 既存ファイルかどうか
   }
   ```

### 5.2 添付ファイル操作
1. 添付取り消し
   ```typescript
   handleCancelAttach(fileId);  // ファイルリストから削除
   ```

2. ファイル完全削除
   ```typescript
   handleDeletePermanently(fileId);  // APIリクエストでファイル削除
   ```

3. ファイルプレビュー
   ```tsx
   <FilePreview
     file={file}
     onCancel={handleCancelAttach}
     onDelete={handleDeletePermanently}
   />
   ```

## 6. エラーハンドリング

```typescript
try {
  // API リクエスト
  const response = await api.post('/api/post/post_create', payload);
  
  // 成功時の処理
  addNotification('投稿が成功しました！');
  setPostText('');
  setFiles([]);
  
  // 投稿一覧更新
  if (response.data.post_text) {
    setPosts(prevPosts => [response.data, ...prevPosts]);
  }
} catch (error) {
  console.error('投稿処理でエラーが発生しました:', error);
  // エラー通知
  addNotification('投稿に失敗しました');
  // エラー状態設定
  setStatus('投稿に失敗しました');
}
```

## 7. 命名規則

### 7.1 コンポーネント
- メインコンポーネント: `PascalCase`
  例: `PostForm`, `PostCard`, `FilePreview`

### 7.2 関数
- イベントハンドラ: `handle{Event}`
  例: `handleSubmit`, `handleDelete`, `handleDrop`
- カスタムフック: `use{Feature}`
  例: `useHashtags`, `useFileUpload`
- コールバック: `on{Action}`
  例: `onDelete`, `onQuote`, `onCorrect`

### 7.3 変数
- 状態変数: 説明的な名前
  例: `postText`, `isLoading`, `selectedHashtags`
- ref: `{feature}Ref`
  例: `fileInputRef`, `dropRef`, `menuRef`

## 8. コンポーネント間の連携

### 8.1 投稿修正機能の連携
```
PostCard → onCorrect() → Diary → setIsModalOpen(true) → PostFormPopup
```

1. `PostCard`で修正ボタンクリック
   - `onCorrect(post)` を呼び出し

2. `Diary`（親コンポーネント）で処理
   - `setRepostData(post)` で修正対象を設定
   - `setRepostText(post.post_text)` で元のテキストを設定
   - `setIsModalOpen(true)` でモーダル表示

3. `PostFormPopup`で修正UI表示
   - `mode="correct"` で修正モード動作
   - 元のファイルを `fetchFileMetadata()` で取得
   - 修正投稿送信時に元の投稿を削除してから再投稿

### 8.2 引用・返信機能の連携
```
PostCard → {onQuote|onReply} → Diary → handleQuoteSubmit → API
```

1. `PostCard`でボタンクリック
   - `handleQuote()` または `handleReply()` を呼び出し
   - `onQuote(post)` または `onReply(post)` をコールバック

2. `Diary`で処理
   - `handleQuoteSubmit()` で引用・返信投稿を作成
   - APIに適切なパラメータ（`repost_id` または `reply_id`）を追加

## 9. 今後の改善点

1. 状態管理の改善
   - Context API または Redux/Zustand などの導入検討
   - コンポーネント間の複雑なデータ受け渡しの整理

2. パフォーマンス最適化
   - 画像の最適化とプレロード戦略
   - 仮想スクロールの導入による長いリストの効率化
   - メモ化の適切な使用

3. UX改善
   - 投稿編集履歴の表示
   - 下書き保存機能
   - より詳細なエラーメッセージ

4. テスト強化
   - ユニットテスト導入
   - インテグレーションテストの実装
   - E2Eテスト導入

5. アクセシビリティ強化
   - スクリーンリーダー対応の改善
   - キーボードナビゲーションの整備
   - コントラスト比の調整

## 10. 開発ガイドライン

1. コンポーネント開発
   - 責務の明確な分離
   - 再利用可能なコンポーネント設計
   - Props の型定義を徹底

2. コード品質
   - TypeScript の型定義を厳密に
   - ESLint/Prettier の活用
   - コメント記述の徹底

3. セキュリティ
   - ユーザー入力の適切なバリデーション
   - XSS対策の徹底
   - APIリクエストの適切なエラーハンドリング
