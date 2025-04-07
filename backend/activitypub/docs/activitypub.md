# Wallog ActivityPub 実装仕様書

## 1. 概要

Wallogブログシステムに限定的なActivityPub対応を実装し、外部のFediverseサービス（MastodonやMisskeyなど）からフォロー可能にすることで、記事の配信範囲を拡大します。

### 1.1. 実装方針

- **限定的な実装**: 投稿配信とフォロー受付のみに機能を制限
- **ブログ中心**: SNSではなくブログとしての機能に焦点
- **高い互換性**: Mastodon/Misskey等の主要サービスとの互換性確保
- **スケーラブル**: 将来的に機能拡張しやすい設計

### 1.2. 実装範囲

- ✅ WebFinger対応
- ✅ Actor情報提供
- ✅ フォローリクエスト受付・自動承認
- ✅ 日記投稿の配信
- ✅ メディア（画像）の配信
- ❌ 外部投稿の表示
- ❌ 返信・お気に入り機能

## 2. ディレクトリ構造

```
backend/
  ├── activitypub/
  │   ├── index.js         # メインエントリーポイント
  │   ├── routes.js        # ルーティング設定
  │   ├── controllers/     # コントローラー
  │   │   ├── webfinger.js # WebFinger対応
  │   │   ├── actor.js     # Actor対応
  │   │   ├── inbox.js     # Inbox処理
  │   │   ├── outbox.js    # Outbox処理
  │   │   └── follow.js    # フォロー処理
  │   ├── models/          # モデル
  │   │   ├── actor.js     # アクター
  │   │   ├── follower.js  # フォロワー
  │   │   └── activity.js  # アクティビティ
  │   ├── services/        # サービス
  │   │   ├── signature.js # 署名検証
  │   │   ├── delivery.js  # 配送サービス
  │   │   └── keys.js      # 鍵管理
  │   └── utils/           # ユーティリティ
  │       ├── constants.js # 定数
  │       └── helpers.js   # ヘルパー関数
```

## 3. データベース構造

以下のテーブルを新規追加します：

### 3.1. ap_actors

アクター（ユーザーまたはシステムアカウント）情報を管理します。

```sql
CREATE TABLE ap_actors (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  inbox_url TEXT NOT NULL,
  outbox_url TEXT,
  following_url TEXT,
  followers_url TEXT,
  public_key TEXT NOT NULL,
  private_key TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2. ap_followers

フォロワー関係を管理します。

```sql
CREATE TABLE ap_followers (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES ap_actors(id) ON DELETE CASCADE,
  follower_actor_id INTEGER REFERENCES ap_actors(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(actor_id, follower_actor_id)
);
```

### 3.3. ap_outbox

送信したアクティビティを記録します。

```sql
CREATE TABLE ap_outbox (
  id SERIAL PRIMARY KEY,
  activity_id VARCHAR(255) NOT NULL UNIQUE,
  actor_id INTEGER REFERENCES ap_actors(id) ON DELETE CASCADE,
  object_id VARCHAR(255),
  object_type VARCHAR(50) NOT NULL,
  object_content TEXT,
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data JSONB NOT NULL,
  referenced_object_id VARCHAR(255),
  local_post_id VARCHAR(255)
);
```

## 4. 主要コンポーネント

### 4.1. WebFinger (/.well-known/webfinger)

Fediverseでのアカウント検出に必要なエンドポイントです。

```javascript
// WebFinger対応例
router.get('/.well-known/webfinger', async (req, res) => {
  // resource=acct:username@domain形式のリクエスト処理
  // 該当ユーザーが存在する場合はJSONを返し、それ以外は404
});
```

### 4.2. Actor情報 (/users/:username)

ActorのJSON-LD表現を提供します。

```javascript
// Actor情報提供例
router.get('/users/:username', async (req, res) => {
  // ContentType: application/activity+json
  // ActorのJSON-LD表現を返す
});
```

### 4.3. Inbox処理 (/inbox, /users/:username/inbox)

外部サーバーからのアクティビティを受信・処理します。

```javascript
// Inbox処理の基本例
router.post('/inbox', async (req, res) => {
  // HTTPシグネチャの検証
  // アクティビティタイプによる分岐処理
  // Followの場合はAcceptを返す
});
```

### 4.4. 投稿配信処理

新規投稿をActivityPubフォロワーに配信します。

```javascript
// 投稿配信の基本実装例
async function deliverToFollowers(noteObject, actor, followers) {
  // Create, Note形式のアクティビティを生成
  // 各フォロワーのinboxに配送
  // 署名付きHTTPリクエスト処理
}
```

## 5. 認証とセキュリティ

### 5.1. HTTPシグネチャ

```javascript
// 署名生成の基本実装
async function createSignature(url, method, date, digest, privateKey) {
  const signString = `(request-target): ${method.toLowerCase()} ${url}\nhost: ${host}\ndate: ${date}\ndigest: ${digest}`;
  // 署名生成処理
}

// 署名検証の基本実装
async function verifySignature(req) {
  // リクエストからシグネチャを取得
  // 対応するActorの公開鍵を取得
  // シグネチャを検証
}
```

## 6. 実装ステップ

### 6.1. 既存の実装状況
- ディレクトリ構造の設計 ✅
- データベーステーブルの定義 ✅
- 基本コンセプト・アーキテクチャの決定 ✅

### 6.2. 実装予定
1. **基礎インフラ整備** (推定: 1日)
   - データベースマイグレーション
   - 依存パッケージの導入
   - 環境変数設定

2. **WebFinger実装** (推定: 1日)
   - /.well-known/webfinger対応
   - Actor情報提供エンドポイント

3. **Inbox・フォロー受付** (推定: 2日)
   - HTTP署名検証実装
   - フォロー受付・自動承認処理
   - フォロワー管理

4. **投稿配信機能** (推定: 2日)
   - 日記投稿のNote変換処理
   - フォロワーへの配信処理
   - メディア対応

5. **テスト・デバッグ** (推定: 2日)
   - Mastodon/Misskeyとの互換性テスト
   - エラー処理改善
   - パフォーマンス確認

6. **ドキュメント・モニタリング** (推定: 1日)
   - 運用ドキュメント作成
   - エラーログ監視設定

## 7. Nginx設定

ActivityPubに必要なエンドポイントをルーティングするNginx設定：

```nginx
# ActivityPub関連エンドポイント
location /.well-known/webfinger {
    proxy_pass http://backend:5000/.well-known/webfinger;
    proxy_set_header Host $host;
    # 他のヘッダー設定
}

location /.well-known/nodeinfo {
    proxy_pass http://backend:5000/.well-known/nodeinfo;
    # 他のヘッダー設定
}

location /users/ {
    proxy_pass http://backend:5000/users/;
    # 他のヘッダー設定
}

location /inbox {
    proxy_pass http://backend:5000/inbox;
    # 他のヘッダー設定
}
```

## 8. 運用上の注意点

### 8.1. 性能とスケーリング

- フォロワー数増加時の配信処理の遅延対策
- バックグラウンドジョブによる非同期処理の導入
- レート制限の設定

### 8.2. セキュリティ

- HTTPシグネチャ検証の確実な実施
- キャッシュポイズニング対策
- スパムフォロー対策

### 8.3. 互換性

- 主要なFediverseサービスとの互換性確保
- 標準的なActivityPubオブジェクト形式の遵守
- エラー時の適切なステータスコード返却

## 9. 今後の拡張可能性

- 複数ユーザーアカウントとのActivityPub対応
- リプライ・リブースト対応
- 限定公開投稿
- モデレーション機能
- 外部投稿の選択的表示

---

作成日: 2025年4月5日
最終更新: 2025年4月5日
バージョン: 0.1