/**
 * ActivityPubのフォロワー関連のモデル
 * このモジュールはフォロー・フォロワー関係を管理します
 */

import dotenv from 'dotenv';
import { query, beginTransaction, commitTransaction, rollbackTransaction } from '../../db/db.js';

dotenv.config();

/**
 * フォロワー情報を追加する
 * @param {string} targetActorId - フォローされた側のアクターID
 * @param {string} followerActorId - フォローした側のアクターID
 * @param {string} followerUsername - フォローした側のユーザー名
 * @param {string} followerDomain - フォローした側のドメイン
 * @param {string} followerInbox - フォロワーのインボックスURL
 * @returns {Promise<boolean>} 成功したかどうか
 */
export async function addFollower(targetActorId, followerActorId, followerUsername, followerDomain, followerInbox) {
  const client = await beginTransaction();
  
  try {
    console.log(`フォロワー情報をデータベースに追加: ${followerUsername}@${followerDomain} -> Actor ID: ${targetActorId}`);
    
    // まず、フォロワーのアクターレコードがデータベースに存在するか確認
    const followerActorResult = await client.query(
      'SELECT id FROM ap_actors WHERE username = $1 AND domain = $2',
      [followerUsername, followerDomain]
    );
    
    let followerActorDbId;
    
    if (followerActorResult.rows.length === 0) {
      // 存在しない場合は新規作成
      const newActorResult = await client.query(
        `INSERT INTO ap_actors 
        (username, domain, inbox_url, public_key) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id`,
        [followerUsername, followerDomain, followerInbox, ''] // 公開鍵は空で初期化
      );
      followerActorDbId = newActorResult.rows[0].id;
    } else {
      followerActorDbId = followerActorResult.rows[0].id;
      
      // インボックスURLを更新
      await client.query(
        'UPDATE ap_actors SET inbox_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [followerInbox, followerActorDbId]
      );
    }
    
    // ap_followersテーブルにフォロワー情報を挿入
    await client.query(
      `INSERT INTO ap_followers (actor_id, follower_actor_id) 
       VALUES ($1, $2)
       ON CONFLICT (actor_id, follower_actor_id) DO NOTHING`,
      [targetActorId, followerActorDbId]
    );
    
    await commitTransaction(client);
    return true;
  } catch (error) {
    await rollbackTransaction(client);
    console.error('Error adding follower to database:', error);
    return false;
  }
}

/**
 * フォロワー情報を削除する
 * @param {string} targetActorId - フォローされた側のアクターID
 * @param {string} followerActorId - フォローした側のアクターID
 * @returns {Promise<boolean>} 成功したかどうか
 */
export async function removeFollower(targetActorId, followerActorId) {
  try {
    // まず、フォロワーのアクターレコードがデータベースに存在するか確認
    const followerActorResult = await query(
      'SELECT id FROM ap_actors WHERE username = $1 AND domain = $2',
      [followerActorId.split('@')[0], followerActorId.split('@')[1]]
    );
    
    if (followerActorResult.rows.length === 0) {
      console.warn(`フォロワーアクター ${followerActorId} が見つかりません`);
      return true; // 存在しなければ何もしない
    }
    
    const followerActorDbId = followerActorResult.rows[0].id;
    
    // ap_followersテーブルからフォロワー情報を削除
    await query(
      'DELETE FROM ap_followers WHERE actor_id = $1 AND follower_actor_id = $2',
      [targetActorId, followerActorDbId]
    );
    
    return true;
  } catch (error) {
    console.error('Error removing follower from database:', error);
    return false;
  }
}

/**
 * フォロワーのリストを取得する
 * @param {string} actorId - アクターID
 * @param {number} page - ページ番号（0ベース）
 * @param {number} limit - 1ページあたりの件数
 * @param {boolean} countOnly - 件数のみを返すかどうか
 * @returns {Promise<Object>} フォロワーリストとメタ情報
 */
export async function getFollowers(actorId, page = 0, limit = 50, countOnly = false) {
  try {
    if (countOnly) {
      const countResult = await query(
        'SELECT COUNT(*) as total FROM ap_followers WHERE actor_id = $1',
        [actorId]
      );
      
      return { totalItems: parseInt(countResult.rows[0].total) };
    }
    
    const offset = page * limit;
    const followersResult = await query(
      `SELECT f.*, a.username, a.domain, a.inbox_url
       FROM ap_followers f
       JOIN ap_actors a ON f.follower_actor_id = a.id
       WHERE f.actor_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [actorId, limit, offset]
    );
    
    const countResult = await query(
      'SELECT COUNT(*) as total FROM ap_followers WHERE actor_id = $1',
      [actorId]
    );
    
    const totalItems = parseInt(countResult.rows[0].total);
    
    // データをフォーマット
    const items = followersResult.rows.map(row => ({
      actorId: `https://${row.domain}/users/${row.username}`,
      username: row.username,
      domain: row.domain,
      inbox: row.inbox_url,
      followedAt: row.created_at
    }));
    
    return {
      items,
      totalItems
    };
  } catch (error) {
    console.error('Error getting followers from database:', error);
    return { items: [], totalItems: 0 };
  }
}

/**
 * フォロー中のリストを取得する（現在の実装では空の配列を返す）
 * @param {string} actorId - アクターID
 * @param {number} page - ページ番号（0ベース）
 * @param {number} limit - 1ページあたりの件数
 * @param {boolean} countOnly - 件数のみを返すかどうか
 * @returns {Promise<Object>} フォロー中リストとメタ情報
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
    const followersResult = await query(
      `SELECT a.inbox_url
       FROM ap_followers f
       JOIN ap_actors a ON f.follower_actor_id = a.id
       WHERE f.actor_id = $1`,
      [actorId]
    );
    
    // フォロワーのインボックスURLのリストを取得
    const inboxUrls = followersResult.rows
      .filter(row => row.inbox_url) // インボックスURLが存在するものだけに絞る
      .map(row => row.inbox_url);
    
    return inboxUrls;
  } catch (error) {
    console.error('Error getting follower inboxes from database:', error);
    return [];
  }
}