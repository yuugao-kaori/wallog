/**
 * Inboxコントローラー
 * 
 * ActivityPubのInbox処理を担当するコントローラーです。
 * 外部サーバーからのFollow、Undo、Createなどのアクティビティを受け取り処理します。
 */

const { verifySignature } = require('../services/signature');
const { findActorByUsername } = require('../models/actor');
const { saveFollower, removeFollower } = require('../models/follower');
const { sendAcceptFollow } = require('../services/delivery');
const { getActivityActor } = require('../services/actor');

/**
 * サーバー全体のInboxリクエストを処理します
 * @param {object} req - Expressリクエストオブジェクト
 * @param {object} res - Expressレスポンスオブジェクト
 */
async function handleInbox(req, res) {
  try {
    // シグネチャ検証
    const signatureValid = await verifySignature(req);
    if (!signatureValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const activity = req.body;
    
    // アクティビティタイプに応じた処理
    switch (activity.type) {
      case 'Follow':
        await handleFollowActivity(activity);
        break;
      
      case 'Undo':
        if (activity.object && activity.object.type === 'Follow') {
          await handleUndoFollowActivity(activity);
        }
        break;
        
      // 他のアクティビティタイプ（今回は実装しない）
      // case 'Create':
      // case 'Like':
      // case 'Announce':
      
      default:
        // サポートしていないアクティビティタイプは無視する（202 Acceptedを返す）
        break;
    }
    
    // ActivityPubでは処理に成功した場合は202 Acceptedを返す
    return res.status(202).json({ message: 'Accepted' });
    
  } catch (error) {
    console.error('Inbox processing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * ユーザー別Inboxリクエストを処理します
 * @param {object} req - Expressリクエストオブジェクト
 * @param {object} res - Expressレスポンスオブジェクト
 */
async function handleUserInbox(req, res) {
  try {
    const { username } = req.params;
    
    // ユーザーの存在確認
    const targetActor = await findActorByUsername(username);
    if (!targetActor) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 共通のInbox処理を利用
    return handleInbox(req, res);
    
  } catch (error) {
    console.error('User inbox processing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * フォローアクティビティを処理します
 * @param {object} activity - Followアクティビティオブジェクト
 */
async function handleFollowActivity(activity) {
  try {
    // フォロー対象のユーザー名を取得
    const targetActorId = activity.object;
    const targetUsername = targetActorId.split('/').pop();
    
    // フォローするアクターの情報取得
    const followerActor = await getActivityActor(activity.actor);
    if (!followerActor) {
      throw new Error(`Failed to fetch actor information: ${activity.actor}`);
    }
    
    // 対象ユーザーが存在することを確認
    const targetActor = await findActorByUsername(targetUsername);
    if (!targetActor) {
      throw new Error(`Target actor not found: ${targetUsername}`);
    }
    
    // フォロワーとして保存
    await saveFollower(targetActor.id, followerActor.id, activity.id);
    
    // フォロー受諾を送信
    await sendAcceptFollow(activity, targetActor);
    
    console.log(`Follow processed: ${followerActor.username}@${followerActor.domain} -> ${targetUsername}`);
    
  } catch (error) {
    console.error('Follow activity processing error:', error);
    throw error;
  }
}

/**
 * フォロー解除（Undo Follow）アクティビティを処理します
 * @param {object} activity - Undoアクティビティオブジェクト
 */
async function handleUndoFollowActivity(activity) {
  try {
    const followActivity = activity.object;
    
    // フォロー解除対象のユーザー名を取得
    const targetActorId = followActivity.object;
    const targetUsername = targetActorId.split('/').pop();
    
    // フォロー解除するアクターの情報取得
    const followerActor = await getActivityActor(activity.actor);
    if (!followerActor) {
      throw new Error(`Failed to fetch actor information: ${activity.actor}`);
    }
    
    // 対象ユーザーが存在することを確認
    const targetActor = await findActorByUsername(targetUsername);
    if (!targetActor) {
      throw new Error(`Target actor not found: ${targetUsername}`);
    }
    
    // フォロワーから削除
    await removeFollower(targetActor.id, followerActor.id);
    
    console.log(`Unfollow processed: ${followerActor.username}@${followerActor.domain} -> ${targetUsername}`);
    
  } catch (error) {
    console.error('Undo follow activity processing error:', error);
    throw error;
  }
}

module.exports = {
  handleInbox,
  handleUserInbox
};