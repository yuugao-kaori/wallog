# Maximum update depth exceededエラーの対応

## 問題概要

React開発中に以下のエラーが発生：
```Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.```


このエラーは`useEffect`内で状態を更新し、その状態が再び同じ`useEffect`を呼び出すような循環依存が発生した場合に表示される。

## 原因特定

### 循環依存の特定

1. `PostFormCommon.ts`と`PostFormCommon.tsx`間の相互インポート
   - `PostFormCommon.ts`は非推奨ファイルで、`PostFormCommon.tsx`から全てインポートして再エクスポートしている

2. コンポーネント間の双方向データフロー
   - `PostForm.tsx`および`PostFormPopup.tsx`で以下のようなコードが存在：

`
// 親コンポーネントとハッシュタグ関連の状態を同期
useEffect(() => {
  hashtagSetFixedTags(fixedHashtags);
}, [fixedHashtags, hashtagSetFixedTags]);

// 固定ハッシュタグの変更があった場合は親コンポーネントに通知
useEffect(() => {
  if (hashtagFixedTags !== fixedHashtags) {
    setFixedHashtags(hashtagFixedTags);
  }
}, [hashtagFixedTags, fixedHashtags, setFixedHashtags]);
`

これにより、以下の循環が発生：

- 親のfixedHashtagsが変更される
- 1つ目のuseEffectで子の状態を更新
- 子の状態が更新されたことで2つ目のuseEffectが発火
- 親のfixedHashtagsが再び更新される
- 1に戻る（無限ループ）

## 解決策
1. 単方向データフローの実装
親から子へのデータフローのみを維持し、子から親への自動同期を避ける：
`
// 親から子への同期は維持
useEffect(() => {
  hashtagSetFixedTags(fixedHashtags);
}, [fixedHashtags, hashtagSetFixedTags]);

// 以下の子から親への自動同期を削除
// useEffect(() => {
//   if (hashtagFixedTags !== fixedHashtags) {
//     setFixedHashtags(hashtagFixedTags);
//   }
// }, [hashtagFixedTags, fixedHashtags, setFixedHashtags]);
`

2. 明示的なイベントハンドラでの状態更新
子の状態変更を親に反映する場合は、明示的なイベントハンドラで処理：

`
// ハッシュタグ変更処理を一箇所で行う
const handleHashtagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  hashtagSetFixedTags(value); // 内部状態を更新
  setFixedHashtags(value);    // 親コンポーネントに通知
};
`

3. データフローを整理する
`PostFormCommon.tsx`の`useHashtags`フックを修正して、外部から提供された値と内部状態の同期をより制御できるようにします：
```
export function useHashtags(
  externalFixedTags: string = '', 
  externalAutoAppend: boolean = false,
  syncToExternal: boolean = false // 外部に同期するかどうかのフラグ
): HashtagsState {
  const [fixedHashtags, setFixedHashtagsInternal] = useState(externalFixedTags);
  const [autoAppendTags, setAutoAppendTagsInternal] = useState(externalAutoAppend);

  // 外部値が変更されたら内部状態を更新
  useEffect(() => {
    setFixedHashtagsInternal(externalFixedTags);
  }, [externalFixedTags]);

  useEffect(() => {
    setAutoAppendTagsInternal(externalAutoAppend);
  }, [externalAutoAppend]);

  // 内部状態を変更するラッパー関数（必要に応じて外部にも通知）
  const setFixedHashtags = useCallback((value: string) => {
    setFixedHashtagsInternal(value);
  }, []);

  const setAutoAppendTags = useCallback((value: boolean) => {
    setAutoAppendTagsInternal(value);
  }, []);
  
  // 他のロジックは同様...

  return {
    // ...他のプロパティ
    fixedHashtags,
    setFixedHashtags,
    autoAppendTags,
    setAutoAppendTags,
    // ...他のプロパティ
  };
}
```

4. 推奨される修正方法
最も簡潔な解決策として、`PostForm.tsx`の以下の部分を削除または修正します：
```
// 削除または修正：親コンポーネントに自動的に通知するuseEffect
useEffect(() => {
  if (hashtagFixedTags !== fixedHashtags) {
    setFixedHashtags(hashtagFixedTags);
  }
}, [hashtagFixedTags, fixedHashtags, setFixedHashtags]);

// 削除または修正：親コンポーネントに自動的に通知するuseEffect
useEffect(() => {
  if (hashtagAutoAppendTags !== autoAppendTags) {
    setAutoAppendTags(hashtagAutoAppendTags);
  }
}, [hashtagAutoAppendTags, autoAppendTags, setAutoAppendTags]);
```
代わりに、変更が必要な場合は明示的なイベントハンドラーで処理します：
```
// ハッシュタグ関連のイベントハンドラを作成
const handleHashtagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  hashtagSetFixedTags(value); // 内部状態を更新
  setFixedHashtags(value);    // 親コンポーネントに通知
};
```
まとめ
このエラーは、`useEffect`内での状態更新が再びその`useEffect`を発火させる循環に起因しています。解決するには：

双方向の状態同期を避け、単方向のデータフローを実装する
必要な場合のみ状態を更新する条件を適切に設定する
状態の変更を明示的なイベントハンドラで処理する
上記の修正を適用することで、「`Maximum update depth exceeded`」エラーを解消できるはずです。