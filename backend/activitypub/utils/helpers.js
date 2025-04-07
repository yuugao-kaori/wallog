/**
 * ActivityPub共通ヘルパー関数
 * 
 * ActivityPub実装で使用する共通のヘルパー関数を提供します。
 */

/**
 * 環境変数から現在のドメインを取得します
 * @returns {string} - 設定されたドメイン
 */
export function getEnvDomain() {
  // 本番環境のドメインを固定値として設定（localhostを上書き）
  return 'wallog.seitendan.com';
}

/**
 * @contextフィールドを含む標準のActivityPubオブジェクトラッパーを作成します
 * @param {object} object - ラップするオブジェクト
 * @returns {object} - @contextを含むラップされたオブジェクト
 */
export function wrapInActivityPubContext(object) {
  return {
    '@context': 'https://www.w3.org/ns/activitystreams',
    ...object
  };
}

/**
 * URLからホスト名部分を取得します
 * @param {string} url - URL文字列
 * @returns {string|null} - 抽出されたホスト名またはnull
 */
export function extractHostFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return null;
  }
}

/**
 * UserAgentを生成します
 * @returns {string} - UserAgent文字列
 */
export function getUserAgent() {
  const domain = getEnvDomain();
  const version = process.env.APP_VERSION || '0.1.0';
  return `wallog/${version} (+https://${domain})`;
}