import express from 'express';
import session from 'express-session';
import cors from 'cors';
import http from 'http';
import post_wsRoute from './api/post/post_ws.js';
import fs from 'fs' ;
import dotenv from 'dotenv';

const app = express();
const port = 5000;
const envFilePath = './.env';
const REACT_APP_SITE_DOMAIN = 'https://wallog.seiteidan.com'
// CORSの設定
app.use(cors({
    origin: [REACT_APP_SITE_DOMAIN, 'http://192.168.1.148:13001'],
    credentials: true,
    optionsSuccessStatus: 200
}));
app.options('*', cors());

// bodyParserが必要な場合
app.use(express.json());

// リクエストログミドルウェア
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ルートの定義
import fileCreateRoute from './api/drive/file_create.js';  // 変更: インポート名を変更
import fileListRoute from './api/drive/file_list.js';  // 変更: インポート名を変更
import fileReadRoute from './api/drive/file_read.js';  // 変更: インポート名を変更
import fileDeleteRoute from './api/drive/file_delete.js';  // 変更: インポート名を変更
import post_createRoute from './api/post/post_create.js';
import post_deleteRoute from './api/post/post_delete.js';
import post_sseRoute from './api/post/post_sse.js';
import post_listRoute from './api/post/post_list.js';
import post_searchRoute from './api/post/post_search.js';
import tag_searchRoute from './api/post/tag_search.js';
import post_readRoute from './api/post/post_read.js';
import loginRoute from './api/user/login.js';
import logoutRoute from './api/user/logout.js';
import login_checkRoute from './api/user/login_check.js';
import user_readRoute from './api/user/user_read.js';
import user_updateRoute from './api/user/user_update.js';
import test1Route from './api/test/test1.js';
import test2Route from './api/test/test2.js';
import test3Route from './api/test/test3.js';
import test4Route from './api/test/test4.js';
import settings_readRoute from './api/settings/settings_read.js';
import settings_updateRoute from './api/settings/settings_update.js';
import sticky_note_createRoute from './api/sticky-note/sticky-note_create.js';
import sticky_note_readRoute from './api/sticky-note/sticky-note_read.js';
import sticky_note_updateRoute from './api/sticky-note/sticky-note_update.js';
import sticky_note_deleteRoute from './api/sticky-note/sticky-note_delete.js';
import blog_createRoute from './api/blog/blog_create.js';
import blog_readRoute from './api/blog/blog_read.js';
import blog_updateRoute from './api/blog/blog_update.js';
import blog_deleteRoute from './api/blog/blog_delete.js';
import blog_listRoute from './api/blog/blog_list.js';
import hashtagRankRoute from './api/hashtag/hashtag_rank.js';

// ファイルアップロードルートの設定（file_create.js を使用）
app.use('/api/drive', fileCreateRoute, fileListRoute, fileReadRoute, fileDeleteRoute);  // 変更: useメソッドを使用
app.use('/api/post', post_createRoute, post_deleteRoute, post_readRoute, post_searchRoute, tag_searchRoute, post_listRoute, post_sseRoute);
app.use('/api/user', loginRoute, logoutRoute, login_checkRoute, user_readRoute, user_updateRoute);
app.use('/api/test', test1Route, test2Route, test3Route, test4Route);
app.use('/api/settings', settings_readRoute, settings_updateRoute);
app.use('/api/sticky_note', sticky_note_createRoute, sticky_note_readRoute, sticky_note_updateRoute, sticky_note_deleteRoute);
app.use('/api/blog', blog_createRoute, blog_readRoute, blog_updateRoute, blog_deleteRoute, blog_listRoute);
app.use('/api/hashtag', hashtagRankRoute);

// 404エラーハンドリング
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] 404 Not Found: ${req.method} ${req.url}`);
    res.status(404).send('404 Not Found');
});

// エラーハンドリングミドルウェア
app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Error:`, err);
    res.status(500).send('Internal Server Error');
});

const server = http.createServer(app);

// WebSocket��ーバーを設定
post_wsRoute(server);

server.listen(port, () => {
    console.log(`Express app listening on port ${port}`);
});
