/**
 * ActivityPub関連の定数定義
 * 
 * ActivityPub実装で使用する各種定数を提供します。
 */

// MIMEタイプ
export const MIME_TYPES = {
  ACTIVITY_JSON: 'application/activity+json',
  LD_JSON: 'application/ld+json',
  JRD_JSON: 'application/jrd+json',
  JSON: 'application/json'
};

// ActivityPub標準のコンテキストURL
export const AS_CONTEXT = 'https://www.w3.org/ns/activitystreams';

// ActivityPubのアクティビティタイプ
export const ACTIVITY_TYPES = {
  CREATE: 'Create',
  UPDATE: 'Update',
  DELETE: 'Delete',
  FOLLOW: 'Follow',
  ACCEPT: 'Accept',
  REJECT: 'Reject',
  ADD: 'Add',
  REMOVE: 'Remove',
  LIKE: 'Like',
  ANNOUNCE: 'Announce',
  UNDO: 'Undo',
  BLOCK: 'Block'
};

// ActivityPubのオブジェクトタイプ
export const OBJECT_TYPES = {
  NOTE: 'Note',
  ARTICLE: 'Article',
  PERSON: 'Person',
  DOCUMENT: 'Document',
  IMAGE: 'Image',
  VIDEO: 'Video',
  PAGE: 'Page',
  QUESTION: 'Question',
  TOMBSTONE: 'Tombstone',
  PLACE: 'Place',
  PROFILE: 'Profile'
};

// 特殊な公開範囲
export const PUBLIC_COLLECTION = 'https://www.w3.org/ns/activitystreams#Public';

// アクターとオブジェクトの標準フィールド
export const STANDARD_ACTOR_FIELDS = [
  'id', 'type', 'name', 'preferredUsername', 'summary',
  'inbox', 'outbox', 'following', 'followers', 'publicKey'
];