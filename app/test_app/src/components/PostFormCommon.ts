// このファイルは非推奨です。PostFormCommon.tsx を使用してください。
// 後方互換性のためにexportを維持しつつ、正しい実装をtsxファイルに移行

import {
  FileItem, 
  HashtagInfo,
  HashtagsState,
  FilePreviewProps,
  FilePreview,
  cleanFileId,
  processPostText,
  useHashtags,
  useFileUpload,
  isImageFile
} from './PostFormCommon.tsx';

// 型定義のエクスポート
export type {
  FileItem,
  HashtagInfo, // HashtagInfoのみをエクスポートし、HashtagItemの別名を削除
  HashtagsState,
  FilePreviewProps
};

// 関数のエクスポート
export {
  FilePreview,
  cleanFileId,
  processPostText,
  useHashtags,
  useFileUpload,
  isImageFile
};

// 投稿モードの種類を定義（後方互換性のため）
export type PostMode = 'normal' | 'quote' | 'reply' | 'correct';
