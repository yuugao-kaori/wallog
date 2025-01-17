export function extractDescriptionFromHtml(html) {
  if (!html) return null;
  
  // pタグの内容を抽出する正規表現
  const pTagRegex = /<p>(.*?)<\/p>/g;
  const matches = [...html.matchAll(pTagRegex)];
  
  if (matches.length === 0) return null;
  
  // すべてのp要素のテキストを結合
  const fullText = matches.map(match => match[1]
    .replace(/<[^>]*>/g, '')) // 残りのHTMLタグを削除
    .join(' ');
  
  // 最初の100文字を返す
  return fullText.slice(0, 100);
}
