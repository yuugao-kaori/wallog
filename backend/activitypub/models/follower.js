/**
 * ActivityPubのフォロワー関連のモデル
 * このモジュールはフォロー・フォロワー関係を管理します
 */

import dotenv from 'dotenv';

dotenv.config();

// メモリ内のフォロワー情報（実際の実装ではデータベースに保存する）
const followers = {
  // actorId -> 配列[{username, domain}]
};

/**
 * フォロワー情報を追加する
 * @param {string} targetActorId - フォローされた側のアクターID
 * @param {string} followerActorId - フォローした側のアクターID
 * @param {string} followerUsername - フォローした側のユーザー名
 * @param {string} followerDomain - フォローした側のドメイン
 * @param {string} followerInbox - フォロワーのインボックスURL
 * @returns {boolean} 成功したかどうか
 */
export async function addFollower(targetActorId, followerActorId, followerUsername, followerDomain, followerInbox) {
  try {
    // フォロワーリストを初期化（存在しない場合）
    if (!followers[targetActorId]) {
      followers[targetActorId] = [];
    }
    
    // 既に存在するフォロワーかチェック
    const existingIndex = followers[targetActorId].findIndex(
      f => f.actorId === followerActorId
    );
    
    if (existingIndex === -1) {
      // 存在しなければ追加
      followers[targetActorId].push({
        actorId: followerActorId,
        username: followerUsername,
        domain: followerDomain,
        inbox: followerInbox,  // インボックスURLも保存
        followedAt: new Date()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error adding follower:', error);
    return false;
  }
}

/**
 * フォロワー情報を削除する
 * @param {string} targetActorId - フォローされた側のアクターID
 * @param {string} followerActorId - フォローした側のアクターID
 * @returns {boolean} 成功したかどうか
 */
export async function removeFollower(targetActorId, followerActorId) {
  try {
    if (!followers[targetActorId]) {
      return true; // フォロワーリストが存在しない場合は何もしない
    }
    
    // フォロワーリストからフィルタリング
    followers[targetActorId] = followers[targetActorId].filter(
      f => f.actorId !== followerActorId
    );
    
    return true;
  } catch (error) {
    console.error('Error removing follower:', error);
    return false;
  }
}

/**
 * フォロワーのリストを取得する
 * @param {string} actorId - アクターID
 * @param {number} page - ページ番号（0ベース）
 * @param {number} limit - 1ページあたりの件数
 * @param {boolean} countOnly - 件数のみを返すかどうか
 * @returns {Object} フォロワーリストとメタ情報
 */
export async function getFollowers(actorId, page = 0, limit = 50, countOnly = false) {
  try {
    const actorFollowers = followers[actorId] || [];
    const totalItems = actorFollowers.length;
    
    if (countOnly) {
      return { totalItems };
    }
    
    // ページネーション
    const startIndex = page * limit;
    const items = actorFollowers.slice(startIndex, startIndex + limit);
    
    return {
      items,
      totalItems
    };
  } catch (error) {
    console.error('Error getting followers:', error);
    return { items: [], totalItems: 0 };
  }
}

/**
 * フォロー中のリストを取得する（現在の実装では空の配列を返す）
 * @param {string} actorId - アクターID
 * @param {number} page - ページ番号（0ベース）
 * @param {number} limit - 1ページあたりの件数
 * @param {boolean} countOnly - 件数のみを返すかどうか
 * @returns {Object} フォロー中リストとメタ情報
 */
export async function getFollowing(actorId, page = 0, limit = 50, countOnly = false) {
  // 現在の実装ではフォロー機能は実装していないため、空のリストを返す
  return {
    items: [],
    totalItems: 0
  };
}

/**
 * すべてのフォロワーのインボックスURLを取得する
 * @param {string} actorId - アクターID
 * @returns {Promise<string[]>} - インボックスURLの配列
 */
export async function getAllFollowerInboxes(actorId) {
  try {
    const actorFollowers = followers[actorId] || [];
    
    // フォロワーのインボックスURLのリストを取得
    const inboxUrls = actorFollowers
      .filter(follower => follower.inbox) // インボックスURLが存在するものだけに絞る
      .map(follower => follower.inbox);
    
    return inboxUrls;
  } catch (error) {
    console.error('Error getting follower inboxes:', error);
    return [];
  }
}