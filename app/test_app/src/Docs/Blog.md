# Wallog ブログ機能仕様書

## システム概要

Wallogはマークダウン形式のブログ投稿、表示、編集機能を持つウェブアプリケーションです。ログイン済みユーザーはブログの作成、編集、削除が可能です。

## コンポーネント構成

### 主要コンポーネント

1. **BlogPage (`/src/app/blog/page.tsx`)**: 
   - ブログ一覧ページのメインコンポーネント
   - ブログ記事の一覧表示とページネーション
   - 新規ブログ作成機能

2. **BlogDetail (`/src/app/blog/[blog_id]/page.tsx`)**: 
   - ブログ詳細表示ページ
   - マークダウンからHTMLへの変換とレンダリング
   - コードブロックのシンタックスハイライト
   - 目次生成と表示
   - ブログ編集・削除機能

3. **BlogFormPopup (`/src/components/Blogformpopup.tsx`)**: 
   - ブログ作成/編集用のポップアップフォーム
   - マークダウン入力支援
   - Undo/Redo機能

4. **BlogCard (`/src/components/BlogCard.tsx`)**: 
   - ブログ一覧での各記事のカード表示
   - 記事サムネイル、タイトル、説明の表示

## 機能とデータフロー

### ブログ一覧表示

**担当**: BlogPage

1. **初期化時**:
   - ログイン状態のチェック (`/api/user/login_check`)
   - ブログ一覧の取得 (`/api/blog/blog_list`)
   - ページネーション情報の設定

2. **ページネーション**:
   - ページ選択時に新たなデータを取得
   - 1ページあたり12件の記事を表示

### ブログ詳細表示

**担当**: BlogDetail

1. **初期化時**:
   - URLのblog_idからブログデータを取得 (`/api/blog/blog_read/{blog_id}`)
   - マークダウンのパース処理
   - コードブロックの検出とシンタックスハイライト
   - 目次の生成

2. **レンダリング後**:
   - コードブロックのReactDOMレンダリング
   - 見出しに適切なIDを付与し目次からのリンクを有効化

### ブログ作成/編集

**担当**: BlogFormPopup

1. **ブログ作成**:
   - タイトルと本文の入力
   - マークダウン記法のサポート
   - 送信時に `/api/blog/blog_create` にPOSTリクエスト

2. **ブログ編集**:
   - 既存のブログデータをフォームに読み込み
   - 編集完了後 `/api/blog/blog_update/{blog_id}` にPUTリクエスト

3. **ブログ削除**:
   - 削除確認後 `/api/blog/blog_delete` にPOSTリクエスト

## API インターフェース

### 1. ブログ一覧取得 API

**エンドポイント**: `/api/blog/blog_list`  
**メソッド**: GET  
**パラメータ**:
- `offset`: 取得開始位置
- `limit`: 取得数

**レスポンス例**:
```json
{
  "blogs": [
    {
      "blog_id": "bl_0123456789",
      "blog_title": "サンプルブログ",
      "blog_text": "ブログ本文...",
      "blog_description": "ブログの説明",
      "blog_thumbnail": "サムネイル画像URL",
      "blog_createat": "2023-01-01T12:00:00Z",
      "blog_updateat": "2023-01-01T12:00:00Z",
      "blog_count": 0
    },
    ...
  ],
  "total": 100
}
```

### 2. ブログ詳細取得 API

**エンドポイント**: `/api/blog/blog_read/{blog_id}`  
**メソッド**: GET  

**レスポンス例**:
```json
{
  "blog_id": "bl_0123456789",
  "blog_title": "サンプルブログ",
  "blog_text": "# マークダウン形式の本文\n\nこれはサンプルです。",
  "blog_pursed_text": "<h1>マークダウン形式の本文</h1><p>これはサンプルです。</p>",
  "blog_thumbnail": "サムネイル画像URL",
  "blog_createat": "2023-01-01T12:00:00Z",
  "blog_updateat": "2023-01-01T12:00:00Z",
  "blog_count": 5,
  "blog_file": "",
  "blog_fixedurl": "",
  "blog_description": "ブログの説明"
}
```

### 3. ブログ作成 API

**エンドポイント**: `/api/blog/blog_create`  
**メソッド**: POST  
**リクエスト本文**:
```json
{
  "blog_title": "新しいブログ",
  "blog_text": "ブログ本文をマークダウンで",
  "blog_file": "",
  "blog_thumbnail": "",
  "blog_fixedurl": ""
}
```

### 4. ブログ更新 API

**エンドポイント**: `/api/blog/blog_update/{blog_id}`  
**メソッド**: PUT  
**リクエスト本文**:
```json
{
  "blog_title": "更新されたタイトル",
  "blog_text": "更新された本文",
  "blog_file": "",
  "blog_thumbnail": "",
  "blog_fixedurl": ""
}
```

### 5. ブログ削除 API

**エンドポイント**: `/api/blog/blog_delete`  
**メソッド**: POST  
**リクエスト本文**:
```json
{
  "file_id": "bl_0123456789"
}
```

## サポートするマークダウン記法

### 1. 見出し
```markdown
# 見出し1
## 見出し2
### 見出し3
```

### 2. リスト
```markdown
- 箇条書き項目
- 別の項目

1. 番号付きリスト
2. 別の番号付き項目
```

### 3. 強調
```markdown
**太字**
*斜体*
~~打消し線~~
```

### 4. コードブロック
