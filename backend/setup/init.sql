-- settingsテーブルの作成
CREATE TABLE IF NOT EXISTS "settings" (
    settings_key TEXT PRIMARY KEY,
    settings_value TEXT NOT NULL,
    is_public BOOLEAN DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_key VARCHAR(255) NOT NULL UNIQUE,
    expires TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "logs" (
    log_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(10) NOT NULL,  -- INFO, WARNING, ERROR, DEBUG など
    source VARCHAR(255),         -- アプリケーション名やモジュール名
    message TEXT NOT NULL,       -- ログメッセージ本体
    user_id TEXT,               -- 関連するユーザーID
    metadata TEXT,             -- 追加のメタデータ（JSON形式）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX sessions_session_key_idx ON sessions(session_key);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_idx ON sessions(expires);

-- postテーブルの作成
CREATE TABLE IF NOT EXISTS "post" (
    post_id NUMERIC PRIMARY KEY,
    user_id TEXT NOT NULL,
    post_text TEXT,
    post_createat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    post_updateat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    post_tag TEXT, -- リスト形式でそのまま収容
    post_file TEXT, -- 半角コンマで区切るfile_id
    post_attitude NUMERIC DEFAULT 1,
    repost_grant_id NUMERIC,
    reply_grant_id NUMERIC,
    repost_receive_id NUMERIC[],
    reply_receive_id NUMERIC[],
    post_hashtag TEXT[],
    x_twitter_id TEXT,
    x_twitter_text TEXT,
    x_twitter_create_at  TIMESTAMP,
    x_twitter_hashtag TEXT[],
    x_twitter_file_name TEXT[],
    x_twitter_attitude NUMERIC DEFAULT 1,
    misskey_id TEXT,
    misskey_text TEXT,
    misskey_create_at  TIMESTAMP,
    misskey_hashtag TEXT[],
    misskey_file_name TEXT[],
    misskey_attitude NUMERIC DEFAULT 1
);

CREATE INDEX post_post_id_idx ON post(post_id);


-- blogテーブルの作成
CREATE TABLE IF NOT EXISTS "blog" (
    blog_id TEXT NOT NULL PRIMARY KEY,
    user_id TEXT NOT NULL,
    blog_title TEXT,
    blog_text TEXT,
    blog_pursed_text TEXT,
    blog_tag TEXT, -- リスト形式でそのまま収容
    blog_createat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blog_updateat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blog_file TEXT, -- 半角コンマで区切るfile_id
    blog_thumbnail TEXT,
    blog_attitude NUMERIC DEFAULT 1,
    blog_fixedurl TEXT,
    blog_count NUMERIC DEFAULT 0,
    blog_description TEXT
);

-- todoテーブルの作成
CREATE TABLE IF NOT EXISTS "todo" (
    todo_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    todo_text TEXT,
    todo_priority INTEGER CHECK (todo_priority BETWEEN 1 AND 5) DEFAULT 3,
    todo_createat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    todo_updateat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    todo_limitat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    todo_category TEXT,
    todo_attitude NUMERIC DEFAULT 1,
    todo_public BOOLEAN DEFAULT true,
    todo_complete BOOLEAN DEFAULT false
);

-- site-cardテーブルの作成
CREATE TABLE IF NOT EXISTS "site-card" (
    site_card_id TEXT PRIMARY KEY,
    url_text TEXT NOT NULL,
    site_card_title TEXT,
    site_card_text TEXT,
    site_card_thumbnail TEXT,
    site_card_createat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- driveテーブルの作成
CREATE TABLE IF NOT EXISTS "drive" (
    file_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_size NUMERIC,
    file_originalname TEXT,
    file_format CHARACTER VARYING,
    file_createat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_updateat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_attitude NUMERIC DEFAULT 1,
    file_exif_public BOOLEAN DEFAULT false,
    file_exif_datetime TIMESTAMP WITH TIME ZONE,
    file_exif_title TEXT,
    file_exif_description TEXT,
    file_exif_gps_latitude TEXT,
    file_exif_gps_longitude TEXT,
    file_exif_gps_altitude TEXT,
    file_exif_gps_public BOOLEAN DEFAULT false,
    file_exif_image_direction TEXT,
    file_exif_make TEXT,
    file_exif_model TEXT,
    file_exif_xresolution TEXT,
    file_exif_yresolution TEXT,
    file_exif_resolution_unit TEXT,
    file_exif_exposure_time TEXT,
    file_exif_fnumber TEXT,
    file_exif_iso TEXT,
    file_exif_metering_mode TEXT,
    file_exif_flash TEXT,
    file_exif_exposure_compensation TEXT,
    file_exif_focal_length TEXT,
    file_exif_color_space TEXT
);

-- userテーブルの作成
CREATE TABLE IF NOT EXISTS "user" (
    user_id TEXT PRIMARY KEY CHECK (LENGTH(user_id) <= 30 AND user_id ~ '^[a-zA-Z0-9_]+$'),
    user_password TEXT NOT NULL,
    user_salt TEXT,
    user_birth DATE DEFAULT '1970-01-01',
    user_icon TEXT,
    user_mail TEXT,
    user_attitude NUMERIC DEFAULT 0,
    user_prof TEXT,
    user_createat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_updateat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_failcount SMALLSERIAL,
    user_token TEXT,
    user_hashtag text[],
    user_post_text text,
    user_auto_hashtag text[]
);

-- sticky-noteテーブルの作成
CREATE TABLE IF NOT EXISTS "sticky-note" (
    sticky-note_id TEXT PRIMARY KEY,
    sticky-note_title TEXT NOT NULL,
    sticky-note_text TEXT,
    sticky-note_remind TEXT,
    sticky-note_attitude NUMERIC DEFAULT 1,
    sticky-note_hashtag TEXT[],
    sticky-note_createat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sticky-note_updateat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- post_tagテーブルの作成
CREATE TABLE IF NOT EXISTS "post_tag" (
    post_tag_id TEXT PRIMARY KEY,
    post_tag_text TEXT
);

-- posts-post_tags中間テーブルの作成
CREATE TABLE IF NOT EXISTS "posts_post_tags" (
    post_id NUMERIC REFERENCES post(post_id),
    post_tag_id TEXT REFERENCES post_tag(post_tag_id),
    PRIMARY KEY (post_id, post_tag_id)
);

-- blog_tagテーブルの作成
CREATE TABLE IF NOT EXISTS "blog_tag" (
    blog_tag_id TEXT PRIMARY KEY,
    blog_tag_text TEXT
);

-- blogs-blog_tags中間テーブルの作成
CREATE TABLE IF NOT EXISTS "blogs_blog_tags" (
    blog_id TEXT REFERENCES blog(blog_id),
    blog_tag_id TEXT REFERENCES blog_tag(blog_tag_id),
    PRIMARY KEY (blog_id, blog_tag_id)
);

-- taskテーブルの作成
CREATE TABLE IF NOT EXISTS "task" (
    task_id NUMERIC PRIMARY KEY,
    task_text TEXT,
    task_category_text TEXT, -- リスト形式でそのまま収容
    task_attitude NUMERIC DEFAULT 0,
    task_createat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    task_updateat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    task_limitat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- task_categoryテーブルの作成
CREATE TABLE IF NOT EXISTS "task_category" (
    task_category_id NUMERIC PRIMARY KEY,
    task_category_text TEXT, -- リスト形式でそのまま収容
    task_createat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    task_updateat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- tasks-task_category中間テーブルの作成
CREATE TABLE IF NOT EXISTS "tasks-task_categories" (
    task_id NUMERIC REFERENCES task(task_id),
    task_category_id NUMERIC REFERENCES task_category(task_category_id),
    PRIMARY KEY (task_id, task_category_id)
);

-- file_exif_datetimeのインデックスを追加（日時でのソート高速化用）
CREATE INDEX drive_file_exif_datetime_idx ON drive(file_exif_datetime);

-- ActivityPub関連テーブル
CREATE TABLE IF NOT EXISTS  ap_actors (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  inbox_url TEXT NOT NULL,
  outbox_url TEXT,
  following_url TEXT,
  followers_url TEXT,
  public_key TEXT NOT NULL,
  private_key TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ActivityPubの鍵管理テーブル
CREATE TABLE IF NOT EXISTS ap_keys (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES ap_actors(id) ON DELETE CASCADE,
  key_id VARCHAR(255) NOT NULL,
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  key_format VARCHAR(50) NOT NULL DEFAULT 'pkcs8', -- 'pkcs8', 'pkcs1', etc.
  algorithm VARCHAR(50) NOT NULL DEFAULT 'rsa-sha256',
  bits INTEGER NOT NULL DEFAULT 2048,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  revoked BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(actor_id, key_id)
);

CREATE INDEX ap_keys_actor_id_idx ON ap_keys(actor_id);
CREATE INDEX ap_keys_is_active_idx ON ap_keys(is_active);

CREATE TABLE IF NOT EXISTS  ap_followers (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES ap_actors(id) ON DELETE CASCADE,
  follower_actor_id INTEGER REFERENCES ap_actors(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(actor_id, follower_actor_id)
);

CREATE TABLE IF NOT EXISTS  ap_outbox (
  id SERIAL PRIMARY KEY,
  activity_id VARCHAR(255) NOT NULL UNIQUE,
  actor_id INTEGER REFERENCES ap_actors(id) ON DELETE CASCADE,
  object_id VARCHAR(255),
  object_type VARCHAR(50) NOT NULL,
  object_content TEXT,
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data JSONB NOT NULL,
  referenced_object_id VARCHAR(255),
  local_post_id VARCHAR(255)
);