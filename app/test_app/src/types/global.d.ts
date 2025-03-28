// グローバル型定義
interface Window {
  // ハッシュタグの自動保存用タイマー
  hashtagSaveTimer?: NodeJS.Timeout;
  hashtagAutoSaveTimer?: NodeJS.Timeout;
  
  // その他のグローバルプロパティがあれば追加
}