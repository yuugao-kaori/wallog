# 投稿フォームとハッシュタグのサーバーサイド共有機構の実装メモ

## 1. 実装意図と設計目的

### 1.1 背景と課題

Wallogアプリケーションでは、ユーザーが途中で作成した投稿内容や設定を失わないようにするため、以下の課題を解決する必要がありました：

- 複数の場所から投稿できるようにしつつ、どこからでも編集途中のテキストを引き継げること
- ユーザーのハッシュタグ設定（固定タグ、自動付与設定）をアプリ全体で一貫して適用すること
- コンポーネントがマウント・アンマウントされても状態を維持すること
- ネットワークリクエストの最適化（過剰なAPI呼び出しの防止）

### 1.2 設計方針

- **コンポーネント分離**: メイン投稿フォーム(`PostForm`)とポップアップ投稿フォーム(`PostFormPopup`)の2つのUIコンポーネントを提供
- **共通コード抽出**: 状態管理とロジックを共通のカスタムフック(`usePostText`, `useHashtags`)としてまとめる
- **キャッシュ機構**: グローバルオブジェクトを使用したアプリケーション全体でのキャッシュ共有
- **最適化**: デバウンスとスロットリングによるAPI呼び出しの最適化

## 2. コンポーネント構成と責任分担

### 2.1 全体構造

```
PostFormCommon.tsx  ← 共通ロジックとカスタムフック
    ↑
    ├── PostForm.tsx       ← メインの投稿フォーム
    └── PostFormPopup.tsx  ← ポップアップ形式の投稿フォーム
```

### 2.2 各コンポーネントの役割

#### 2.2.1 PostFormCommon.tsx

- 共通カスタムフック(`usePostText`, `useHashtags`, `useFileUpload`)の提供
- グローバルキャッシュオブジェクトの管理
- 汎用UIコンポーネント(`FilePreview`, `HashtagSelector`)の提供
- 型定義とユーティリティ関数の集約

#### 2.2.2 PostForm.tsx

- メインの投稿フォームUIを提供
- 共有された状態を使用して表示と入力を管理
- 親コンポーネントとカスタムフック間の状態同期

#### 2.2.3 PostFormPopup.tsx

- モーダルポップアップの投稿フォームUIを提供
- 引用投稿、返信投稿、投稿修正など特殊な投稿モードの処理
- 親コンポーネントとカスタムフック間の状態同期

## 3. テキスト共有機構 - usePostText

### 3.1 概要

`usePostText`は投稿テキストの状態管理、自動保存、サーバーからの読み込みを行うカスタムフックです。

### 3.2 主要機能

1. **テキスト状態管理**: `postText`の状態とセッター関数を提供
2. **自動保存**: 入力中のテキストを一定時間後にサーバーに自動保存
3. **キャッシュ共有**: グローバルなキャッシュを使って複数のコンポーネント間でテキストを共有
4. **投稿完了通知**: テキストが投稿されたことをサーバーに通知し、クリーンアップ処理を実行

### 3.3 重要な実装ポイント

```typescript
// グローバルキャッシュ - アプリケーション全体で共有
const postTextCache = {
  data: null as string | null,
  lastLoadTime: 0,
  isLoading: false,
  loadPromise: null as Promise<string | null> | null
};

export function usePostText(initialText: string = '') {
  // 状態と設定関数
  const [postText, setPostText] = useState(initialText);
  
  // API呼び出し最適化のための参照とフラグ
  const isSaveScheduled = useRef(false);
  const currentTextRef = useRef(initialText);
  
  // サーバーにテキストを保存する関数
  const savePostText = useCallback(async (): Promise<boolean> => {
    // 投稿済みの場合はnullを送信
    // テキストが前回と同じ場合はスキップ
    // 空テキストは保存しない
    // 成功時はキャッシュも更新
  }, []);
  
  // 遅延保存のスケジューリング
  const scheduleDelayedSave = useCallback(() => {
    // 既にスケジュールされている場合はスキップ
    // テキストが空または前回と同じ場合はスキップ
    // 3秒後に保存を実行
  }, []);
  
  // テキスト変更ハンドラ
  const handlePostTextChange = useCallback((e) => {
    setPostText(e.target.value);
    currentTextRef.current = e.target.value;
    
    // 条件を満たす場合は保存をスケジュール
    if (value.trim() !== '' && value.trim() !== lastSavedText) {
      scheduleDelayedSave();
    }
  }, []);
  
  // サーバーからテキストを読み込む関数
  const loadPostText = useCallback(async (forceReload = false) => {
    // キャッシュが有効なら使用
    // キャッシュが無効ならAPI呼び出し
  }, []);
  
  // 投稿完了を通知する関数
  const markAsPosted = useCallback(() => {
    // 投稿済みフラグをセット
    // テキストをクリアする処理をサーバーに送信
  }, []);

  return {
    postText,
    setPostText, // 自動保存付き
    setPostTextWithoutSave, // 自動保存なし
    handlePostTextChange,
    isTextSaving,
    textSaveError,
    savePostText,
    loadPostText,
    markAsPosted
  };
}
```

## 4. ハッシュタグ共有機構 - useHashtags

### 4.1 概要

`useHashtags`はハッシュタグの選択、固定ハッシュタグの設定、自動付与設定の管理を行うカスタムフックです。

### 4.2 主要機能

1. **タグ選択管理**: ユーザーが選択したタグのセットを管理
2. **固定タグ管理**: ユーザーが設定した固定タグ（自動付与用）を管理
3. **設定の自動保存**: 設定の変更をサーバーに自動保存
4. **プリプロセッサ**: テキスト投稿時にタグを適切に処理する関数を提供

### 4.3 重要な実装ポイント

```typescript
// グローバルキャッシュ - アプリケーション全体で共有
const userSettingsCache = {
  data: null as UserSettings | null,
  lastLoadTime: 0,
  isLoading: false,
  loadPromise: null as Promise<void> | null
};

export function useHashtags(
  initialFixedTags: string = '', 
  initialAutoAppend: boolean = false,
  autoInitializeSelected: boolean = false
) {
  // 状態管理
  const [selectedHashtags, setSelectedHashtags] = useState<Set<string>>(new Set());
  const [fixedHashtags, setFixedHashtags] = useState(initialFixedTags);
  const [autoAppendTags, setAutoAppendTagsState] = useState(initialAutoAppend);
  
  // 無限ループ防止のための参照
  const userSettingsRef = useRef({
    lastLoadTime: 0,
    isLoadedOnce: false,
    fixedHashtags: initialFixedTags,
    autoAppendTags: initialAutoAppend
  });
  
  // ユーザー設定の読み込み
  const loadUserSettings = useCallback(async (forceReload = false) => {
    // キャッシュが有効なら使用
    // キャッシュが無効ならAPI呼び出し
  }, []);
  
  // 自動付与設定の変更ハンドラ
  const handleAutoAppendChange = useCallback((value: boolean) => {
    // 既存値と同じならスキップ
    // API呼び出しを節流（スロットリング）
    // エラー時は前の値に戻す
  }, []);
  
  // ユーザー設定の保存
  const saveUserHashtags = useCallback(async (): Promise<boolean> => {
    // 空白区切りのハッシュタグを配列に変換
    // ハッシュタグが存在する場合は自動付与をtrueに
    // API呼び出し
  }, []);
  
  // 処理されたポストテキストを提供する関数
  const processPostTextWithState = useCallback((text: string) => {
    return processPostText(
      text, 
      selectedHashtags, 
      autoAppendTags, 
      fixedHashtags || ''
    );
  }, [selectedHashtags, autoAppendTags, fixedHashtags]);

  return {
    hashtagRanking,
    selectedHashtags,
    setSelectedHashtags,
    fixedHashtags,
    setFixedHashtags,
    autoAppendTags,
    setAutoAppendTags: handleAutoAppendChange,
    processPostText: processPostTextWithState,
    saveUserHashtags,
    loadUserSettings,
    // その他の状態と関数
  };
}

// ハッシュタグ処理の共通関数
export function processPostText(
  text: string, 
  selectedTags: Set<string>, 
  autoAppend: boolean, 
  fixedTags: string
): string {
  // 元のテキストからハッシュタグを抽出
  // 選択されたタグを追加
  // 固定タグは自動付与設定がtrueの場合のみ追加
  // 重複を排除して結合
  
  return 処理後のテキスト;
}
```

## 5. コンポーネント間の状態同期

### 5.1 親コンポーネントからカスタムフックへの同期

両方のコンポーネント(`PostForm`と`PostFormPopup`)で同様のパターンを採用：

```typescript
// 初回マウント時と親からの値変更時に実行
useEffect(() => {
  // 無限ループ防止のためのチェック
  if (isInitialSync.current) {
    isInitialSync.current = false;
    return;
  }
  
  // 値が実際に変更された場合のみ更新
  if (fixedHashtags !== hashtagsState.fixedHashtags) {
    hashtagsState.setFixedHashtags(fixedHashtags);
  }
  
  if (autoAppendTags !== hashtagsState.autoAppendTags) {
    hashtagsState.setAutoAppendTags(autoAppendTags);
  }
}, [
  fixedHashtags, autoAppendTags, 
  hashtagsState.fixedHashtags, hashtagsState.autoAppendTags,
  hashtagsState.setFixedHashtags, hashtagsState.setAutoAppendTags
]);
```

### 5.2 カスタムフックから親コンポーネントへの同期

```typescript
// ハンドラ関数でカスタムフックの値変更を親に通知
const handleTextChange = useCallback((e) => {
  const newText = e.target.value;
  
  // 親コンポーネントに通知
  setPostText(newText);
  
  // カスタムフック内部の状態も更新
  postTextState.handlePostTextChange(e);
}, [setPostText, postTextState.handlePostTextChange]);
```

## 6. 無限ループ防止のための工夫

### 6.1 isInitialSync フラグ

初回のみ実行すべき処理と、値の変更時に実行すべき処理を分離するためのフラグ：

```typescript
// 静的な値として初期読み込み済みかを判断するフラグ
const isInitialSync = useRef(true);

useEffect(() => {
  if (isInitialSync.current) {
    // 初回の同期は完了したとみなし、フラグをfalseに設定
    isInitialSync.current = false;
    return;
  }
  
  // 値変更時の処理
}, [dependencies]);
```

### 6.2 値の変更チェック

```typescript
// 値が実際に変更された場合のみ更新
if (fixedHashtags !== hashtagsState.fixedHashtags) {
  hashtagsState.setFixedHashtags(fixedHashtags);
}
```

### 6.3 参照オブジェクトによる状態追跡

```typescript
// 設定の読み込み状態を追跡するための参照
const userSettingsRef = useRef({
  lastLoadTime: 0,
  isLoadedOnce: false,
  fixedHashtags: initialFixedTags,
  autoAppendTags: initialAutoAppend
});
```

## 7. キャッシュ機構

### 7.1 グローバルキャッシュオブジェクト

```typescript
// テキストのグローバルキャッシュ
const postTextCache = {
  data: null as string | null,
  lastLoadTime: 0,
  isLoading: false,
  loadPromise: null as Promise<string | null> | null
};

// ユーザー設定のグローバルキャッシュ
const userSettingsCache = {
  data: null as UserSettings | null,
  lastLoadTime: 0,
  isLoading: false,
  loadPromise: null as Promise<void> | null
};
```

### 7.2 キャッシュ有効期間の管理

```typescript
const currentTime = Date.now();
const cacheTime = 60 * 1000; // キャッシュの有効期間: 1分

// キャッシュが有効ならキャッシュを使用
const cacheValid = postTextCache.data !== null && 
                  (currentTime - postTextCache.lastLoadTime < cacheTime);
if (!forceReload && cacheValid) {
  // キャッシュを使用
}
```

### 7.3 Promise キャッシュによる並列リクエスト最適化

```typescript
// すでに他のコンポーネントが読み込み中なら待機
if (postTextCache.isLoading && postTextCache.loadPromise) {
  try {
    return await postTextCache.loadPromise;
  } catch (error) {
    console.error('Waiting for cached loading failed:', error);
  }
}

// Promise自体をキャッシュ
const loadPromise = (async () => { /* API呼び出し */ })();
postTextCache.loadPromise = loadPromise;
```

## 8. API呼び出し最適化

### 8.1 デバウンス処理

```typescript
// 保存処理のデバウンス関数
const debouncedSaveHashtags = useCallback(
  debounce(() => {
    saveUserHashtags()
      .then(success => {
        if (success) {
          console.log('Fixed hashtags saved successfully (debounced)');
        }
      })
      .catch(error => {
        console.error('Failed to save hashtags:', error);
      });
  }, 1000),
  [saveUserHashtags]
);

// debounce関数の実装
function debounce<F extends (...args: any[]) => any>(func: F, wait: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  
  return function(this: any, ...args: Parameters<F>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = undefined;
    }, wait);
  };
}
```

### 8.2 スロットリング（最小間隔の強制）

```typescript
// 最後にAPIが呼び出された時間を記録する参照
const lastApiCallTime = useRef<number>(0);

const now = Date.now();
const MIN_API_INTERVAL = 5000; // 5秒に増やす（無限ループ防止）
if (now - lastApiCallTime.current < MIN_API_INTERVAL) {
  console.log('API call throttled to prevent excessive requests');
  return;
}

// 前回の設定値と実際の値を比較する代わりに現在の状態を使用
lastApiCallTime.current = now;
```

## 9. エラーハンドリング

### 9.1 APIエラーからの復帰

```typescript
try {
  const response = await fetch(userUpdateUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`API returned status ${response.status}`);
  }
  
  // 成功処理
} catch (error) {
  console.error('Error saving auto append setting:', error);
  // エラー発生時は前の値に戻す
  const previousValue = !value;
  userSettingsRef.current.autoAppendTags = previousValue;
  setAutoAppendTagsState(previousValue);
}
```

### 9.2 タイムアウト処理

```typescript
// ネットワークタイムアウト対策
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Request timeout')), 10000);
});

const response = await Promise.race([
  fetch(apiUrl, { 
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  }),
  timeoutPromise
]) as Response;
```

## 10. 今後の改善点

1. **状態管理の統合**: 現在のグローバルキャッシュからReduxやContext APIなどへの移行を検討
2. **TypeScriptの型強化**: より厳密な型チェックと統一されたインターフェース定義
3. **エラー処理の強化**: より統一的なエラー処理とリトライメカニズムの導入
4. **オフライン対応**: オフライン時のローカルストレージ保存とオンライン復帰時の同期機能
5. **パフォーマンス最適化**: 更新処理の効率化とレンダリングの最適化
6. **テスト強化**: ユニットテストとE2Eテストの追加でエッジケースに対応

## まとめ

PostFormとPostFormPopupのテキストフォームと固定ハッシュタグのサーバーサイド共有は、カスタムフック、グローバルキャッシュ、無限ループ防止メカニズムを組み合わせて実装されています。この実装により、異なるコンポーネント間でも一貫したユーザー体験を提供し、バックグラウンドでの自動保存機能によってユーザーの入力の安全性を確保しています。

さらに、APIリクエストの最適化によって、サーバー負荷を軽減しながらもリアルタイムに近い同期を実現しています。