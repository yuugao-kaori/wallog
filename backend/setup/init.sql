-- settingsテーブルの作成
CREATE TABLE IF NOT EXISTS "settings" (
    settings_key TEXT PRIMARY KEY,
    settings_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_key VARCHAR(255) NOT NULL UNIQUE,
    expires TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    repost_id text[],
    reply_id text[]
    post_hashtag TEXT[]
);

-- blogテーブルの作成
CREATE TABLE IF NOT EXISTS "blog" (
    blog_id TEXT NOT NULL PRIMARY KEY,
    user_id TEXT NOT NULL,
    blog_title TEXT,
    blog_text TEXT,
    blog_tag TEXT, -- リスト形式でそのまま収容
    blog_createat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blog_updateat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blog_file TEXT, -- 半角コンマで区切るfile_id
    blog_thumbnail TEXT,
    blog_attitude NUMERIC DEFAULT 1,
    blog_fixedurl TEXT
    blog_count NUMERIC DEFAULT 0
);

-- site-cardテーブルの作成
CREATE TABLE IF NOT EXISTS "site-card" (
    site_card_id NUMERIC PRIMARY KEY,
    url_text TEXT NOT NULL,
    site_card_title TEXT,
    site_card_text TEXT,
    site_card_thumbnail TEXT
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
    file_attitude NUMERIC DEFAULT 1
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

