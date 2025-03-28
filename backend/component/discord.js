/**
 * Discord Integration Component
 * 
 * @module DiscordComponent
 * @description Discord連携機能を提供するコンポーネント。
 * このモジュールはDiscord APIとの連携を行い、メッセージの送信、監視、リアクションの管理などを行います。
 */

import { Client, Events, GatewayIntentBits, Partials, MessagePayload, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config();

// 環境変数からの設定読み込み
const {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_BOT_TOKEN,
  DISCORD_CHANNEL_ID,
  DISCORD_TARGET_USER_ID
} = process.env;

/**
 * Discord接続のための初期設定を行います
 * 
 * @private
 * @type {Client}
 */
let client = null;

/**
 * Discordクライアントの初期化を行います
 * 
 * @returns {Promise<Client>} 初期化されたDiscordクライアント
 * @throws {Error} トークンが無効または接続に失敗した場合
 */
export const initializeDiscordClient = async () => {
  try {
    // クライアントがすでに初期化されていて接続されている場合は再利用
    if (client && client.isReady()) {
      return client;
    }
    
    // 新しいクライアントを作成
    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
      ]
    });

    // ログイン処理
    await client.login(DISCORD_BOT_TOKEN);
    
    // Ready イベントを待機
    await new Promise((resolve) => {
      if (client.isReady()) {
        resolve();
      } else {
        client.once(Events.ClientReady, () => {
          console.log(`Discordに接続しました: ${client.user.tag}`);
          resolve();
        });
      }
    });

    return client;
  } catch (error) {
    console.error('Discordクライアント初期化エラー:', error);
    throw new Error('Discordクライアントの初期化に失敗しました');
  }
};

/**
 * 指定されたチャンネルにメッセージを送信します
 * 
 * @param {string} message - 送信するメッセージ内容
 * @param {string} [channelId=DISCORD_CHANNEL_ID] - メッセージを送信するチャンネルID
 * @returns {Promise<Object>} 送信されたメッセージオブジェクト
 * @throws {Error} メッセージの送信に失敗した場合
 * @example
 * // デフォルトチャンネルにメッセージを送信
 * const sentMessage = await sendMessage('こんにちは、世界！');
 * 
 * // 特定のチャンネルにメッセージを送信
 * const sentMessage = await sendMessage('特別なメッセージ', '1234567890123456789');
 */
export const sendMessage = async (message, channelId = DISCORD_CHANNEL_ID) => {
  try {
    const discordClient = await initializeDiscordClient();
    const channel = await discordClient.channels.fetch(channelId);
    
    if (!channel || !channel.isTextBased()) {
      throw new Error(`チャンネルが見つからないか、テキストチャンネルではありません: ${channelId}`);
    }
    
    return await channel.send(message);
  } catch (error) {
    console.error('メッセージ送信エラー:', error);
    throw new Error('メッセージの送信に失敗しました');
  }
};

/**
 * エンベッドメッセージを送信します
 * 
 * @param {Object} embedData - 送信するエンベッドデータ
 * @param {string} [channelId=DISCORD_CHANNEL_ID] - メッセージを送信するチャンネルID
 * @returns {Promise<Object>} 送信されたメッセージオブジェクト
 * @throws {Error} メッセージの送信に失敗した場合
 * @example
 * // エンベッドメッセージを送信
 * const embed = {
 *   title: '新しい投稿',
 *   description: '投稿の内容',
 *   color: 0x0099ff,
 *   fields: [
 *     { name: '作成者', value: 'ユーザー名', inline: true },
 *     { name: '投稿日時', value: '2023-05-01', inline: true }
 *   ]
 * };
 * const sentMessage = await sendEmbedMessage(embed);
 */
export const sendEmbedMessage = async (embedData, channelId = DISCORD_CHANNEL_ID) => {
  try {
    const discordClient = await initializeDiscordClient();
    const channel = await discordClient.channels.fetch(channelId);
    
    if (!channel || !channel.isTextBased()) {
      throw new Error(`チャンネルが見つからないか、テキストチャンネルではありません: ${channelId}`);
    }
    
    const embed = new EmbedBuilder(embedData);
    return await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('エンベッドメッセージ送信エラー:', error);
    throw new Error('エンベッドメッセージの送信に失敗しました');
  }
};

/**
 * 特定のユーザーにメンションを送信します
 * 
 * @param {string} message - メンションとともに送信するメッセージ
 * @param {string} [userId=DISCORD_TARGET_USER_ID] - メンションするユーザーのID
 * @param {string} [channelId=DISCORD_CHANNEL_ID] - メッセージを送信するチャンネルID
 * @returns {Promise<Object>} 送信されたメッセージオブジェクト
 * @throws {Error} メッセージの送信に失敗した場合
 * @example
 * // デフォルトユーザーにメンションを送信
 * const sentMessage = await sendMention('確認をお願いします');
 * 
 * // 特定のユーザーにメンションを送信
 * const sentMessage = await sendMention('こちらの件について', '9876543210987654321');
 */
export const sendMention = async (message, userId = DISCORD_TARGET_USER_ID, channelId = DISCORD_CHANNEL_ID) => {
  try {
    const discordClient = await initializeDiscordClient();
    const channel = await discordClient.channels.fetch(channelId);
    
    if (!channel || !channel.isTextBased()) {
      throw new Error(`チャンネルが見つからないか、テキストチャンネルではありません: ${channelId}`);
    }
    
    return await channel.send(`<@${userId}> ${message}`);
  } catch (error) {
    console.error('メンション送信エラー:', error);
    throw new Error('メンションの送信に失敗しました');
  }
};

/**
 * メッセージに絵文字リアクションを追加します
 * 
 * @param {string} messageId - リアクションを追加するメッセージのID
 * @param {string} emoji - 追加する絵文字（Unicode絵文字または絵文字ID）
 * @param {string} [channelId=DISCORD_CHANNEL_ID] - メッセージのあるチャンネルID
 * @returns {Promise<Object>} 追加されたリアクションオブジェクト
 * @throws {Error} リアクションの追加に失敗した場合
 * @example
 * // メッセージに「👍」リアクションを追加
 * await addReaction('1234567890123456789', '👍');
 */
export const addReaction = async (messageId, emoji, channelId = DISCORD_CHANNEL_ID) => {
  try {
    const discordClient = await initializeDiscordClient();
    const channel = await discordClient.channels.fetch(channelId);
    
    if (!channel || !channel.isTextBased()) {
      throw new Error(`チャンネルが見つからないか、テキストチャンネルではありません: ${channelId}`);
    }
    
    const message = await channel.messages.fetch(messageId);
    return await message.react(emoji);
  } catch (error) {
    console.error('リアクション追加エラー:', error);
    throw new Error('リアクションの追加に失敗しました');
  }
};

/**
 * 特定のチャンネルのメッセージを監視し、コールバック関数を実行します
 * 
 * @param {Function} callback - 新しいメッセージに対して実行するコールバック関数
 * @param {string} [channelId=DISCORD_CHANNEL_ID] - 監視するチャンネルID
 * @returns {Function} リスナーを削除するための関数
 * @example
 * // メッセージ監視を開始
 * const removeListener = watchMessages((message) => {
 *   console.log(`新しいメッセージ: ${message.content}`);
 * });
 * 
 * // 監視を停止する場合
 * removeListener();
 */
export const watchMessages = (callback, channelId = DISCORD_CHANNEL_ID) => {
  let initialized = false;
  
  const handleMessage = async (message) => {
    if (message.channelId === channelId) {
      await callback(message);
    }
  };
  
  // メッセージイベントにリスナーを追加
  const setup = async () => {
    if (initialized) return;
    
    const discordClient = await initializeDiscordClient();
    discordClient.on(Events.MessageCreate, handleMessage);
    initialized = true;
  };
  
  // 非同期でセットアップを実行
  setup().catch(error => {
    console.error('メッセージ監視セットアップエラー:', error);
  });
  
  // リスナーを削除する関数を返す
  return () => {
    if (client && initialized) {
      client.removeListener(Events.MessageCreate, handleMessage);
    }
  };
};

/**
 * リアクションの追加を監視します
 * 
 * @param {Function} callback - リアクションが追加されたときに実行するコールバック関数
 * @returns {Function} リスナーを削除するための関数
 * @example
 * // リアクション監視を開始
 * const removeListener = watchReactions((reaction, user) => {
 *   console.log(`${user.tag}が${reaction.emoji.name}のリアクションを追加しました`);
 * });
 * 
 * // 監視を停止する場合
 * removeListener();
 */
export const watchReactions = (callback) => {
  let initialized = false;
  
  const handleReactionAdd = async (reaction, user) => {
    // パーシャルリアクションの場合は完全なデータを取得
    if (reaction.partial) {
      try {
        reaction = await reaction.fetch();
      } catch (error) {
        console.error('リアクションの取得に失敗しました:', error);
        return;
      }
    }
    
    await callback(reaction, user);
  };
  
  // リアクションイベントにリスナーを追加
  const setup = async () => {
    if (initialized) return;
    
    const discordClient = await initializeDiscordClient();
    discordClient.on(Events.MessageReactionAdd, handleReactionAdd);
    initialized = true;
  };
  
  // 非同期でセットアップを実行
  setup().catch(error => {
    console.error('リアクション監視セットアップエラー:', error);
  });
  
  // リスナーを削除する関数を返す
  return () => {
    if (client && initialized) {
      client.removeListener(Events.MessageReactionAdd, handleReactionAdd);
    }
  };
};

/**
 * Discordボットのステータスを設定します
 * 
 * @param {string} status - 表示するステータスメッセージ
 * @param {string} [activityType='PLAYING'] - アクティビティの種類 ('PLAYING', 'STREAMING', 'LISTENING', 'WATCHING', 'COMPETING')
 * @returns {Promise<void>}
 * @throws {Error} ステータスの設定に失敗した場合
 * @example
 * // プレイ中のステータスを設定
 * await setStatus('Wallog System');
 * 
 * // 視聴中のステータスを設定
 * await setStatus('ユーザーの活動', 'WATCHING');
 */
export const setStatus = async (status, activityType = 'PLAYING') => {
  try {
    const discordClient = await initializeDiscordClient();
    
    const activityTypes = {
      'PLAYING': 0,
      'STREAMING': 1,
      'LISTENING': 2,
      'WATCHING': 3,
      'COMPETING': 5
    };
    
    await discordClient.user.setActivity(status, { type: activityTypes[activityType] });
  } catch (error) {
    console.error('ステータス設定エラー:', error);
    throw new Error('ステータスの設定に失敗しました');
  }
};

/**
 * Discordクライアントを終了します
 * 
 * @returns {Promise<void>}
 */
export const destroyDiscordClient = async () => {
  if (client) {
    await client.destroy();
    client = null;
    console.log('Discordクライアントを終了しました');
  }
};

export default {
  initializeDiscordClient,
  sendMessage,
  sendEmbedMessage,
  sendMention,
  addReaction,
  watchMessages,
  watchReactions,
  setStatus,
  destroyDiscordClient
};