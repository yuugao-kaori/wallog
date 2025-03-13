# Diary システム設計ドキュメント

## 1. 概要

Diaryシステムは、投稿の作成、表示、管理を行うコンポーネント群で構成されています。
主にユーザーの投稿、ファイル添付、ハッシュタグ管理などの機能を提供します。

## 2. コンポーネント構造

### 2.1 メインコンポーネント

- `Diary` (`/src/app/diary/page.tsx`)
  - アプリケーションのメインページ
  - 状態管理とルーティングの中心
  - サブコンポーネントの統合

### 2.2 投稿関連コンポーネント

- `PostForm` (`/src/components/PostForm.tsx`)
  - 新規投稿フォーム
  - ファイルアップロード
  - ハッシュタグ管理
  
- `PostFormModal` (`/src/components/PostFormModal.tsx`)
  - 引用・返信用モーダル
  - 投稿編集機能
  
- `PostFormPopup` (`/src/components/PostFormPopup.tsx`)
  - モバイル用投稿フォーム
  - レスポンシブ対応

### 2.3 表示コンポーネント

- `PostFeed` (`/src/components/PostFeed.tsx`)
  - 投稿一覧の表示
  - 無限スクロール
  - SSE による実時間更新
  
- `PostCard` (`/src/components/PostCard.tsx`)
  - 個別投稿の表示
  - インタラクション機能
  - 画像プレビュー

## 3. 共通機能（PostFormCommon）

投稿フォーム関連の共通機能を `PostFormCommon.ts` で管理しています：

### 3.1 カスタムフック

```typescript
// ファイルアップロード管理
useFileUpload({
  files,       // 現在の添付ファイル
  setFiles,    // ファイル更新関数
  onProgress,  // アップロード進捗
  onComplete   // 完了コールバック
})

// ハッシュタグ管理
useHashtags({
  initialTags,    // 初期タグ
  autoAppend,     // 自動付与設定
  onTagSelect     // タグ選択時コールバック
})
```

### 3.2 投稿処理

```typescript
processPostText({
  text,          // 投稿本文
  selectedTags,  // 選択タグ
  autoAppend,    // 自動付与
  fixedTags      // 固定タグ
})
```

## 4. データフロー

1. ユーザー入力
   - テキスト入力 → `PostForm`/`PostFormPopup`
   - ファイル添付 → `useFileUpload`
   - タグ選択 → `useHashtags`

2. 投稿処理
   - テキスト処理 → `processPostText`
   - API リクエスト → `Diary` の `handleSubmit`
   - 状態更新 → `PostFeed` の `setPosts`

3. 表示更新
   - SSE 更新 → `PostFeed`
   - UI 反映 → `PostCard`

## 5. エラーハンドリング

```typescript
try {
  // API リクエスト
  await api.post('/api/post/post_create', payload);
} catch (error) {
  // エラー通知
  addNotification('投稿に失敗しました');
  // 状態復帰
  setLoading(false);
}
```

## 6. 命名規則

### 6.1 コンポーネント
- メインコンポーネント: `PascalCase`
  例: `PostForm`, `PostCard`

### 6.2 関数
- イベントハンドラ: `handle{Event}`
  例: `handleSubmit`, `handleDelete`
- カスタムフック: `use{Feature}`
  例: `useHashtags`, `useFileUpload`

### 6.3 変数
- 状態変数: `{feature}State`
  例: `postText`, `isLoading`
- ref: `{feature}Ref`
  例: `fileInputRef`, `dropRef`

## 7. 開発ガイドライン

1. 新機能追加
   - 共通機能は `PostFormCommon` に集約
   - UI コンポーネントは適切な単位で分割

2. エラーハンドリング
   - API エラーは必ずキャッチ
   - ユーザーへの通知を忘れずに

3. パフォーマンス
   - 大きな配列の更新は `useCallback` を使用
   - 画像は遅延読み込みを実装

4. アクセシビリティ
   - キーボード操作のサポート
   - 適切な ARIA ラベルの使用

## 8. 今後の改善点

1. 状態管理の整理
   - Context API やグローバルストアの検討
   - 重複する状態の統合

2. パフォーマンス改善
   - メモ化の最適化
   - 画像の最適化

3. テスト coverage の向上
   - ユニットテストの追加
   - E2E テストの実装
