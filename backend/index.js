import express from 'express';
import session from 'express-session';
import cors from 'cors';
import http from 'http';  // 追加
import post_wsRoute from './api/post/post_ws.js';  // 修正

const app = express();
const port = 5000;

// CORSの設定
app.use(cors({
    origin: 'http://192.168.1.148:23000',
    credentials: true,
}));
app.options('*', cors());

// bodyParserが必要な場合
app.use(express.json());

// リクエストログミドルウェア
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    res.send('<html><body><h1>test</h1></body></html>');
});

// ルートの定義
import post_createRoute from './api/post/post_create.js';
import loginRoute from './api/user/login.js';
import logoutRoute from './api/user/logout.js';
import login_checkRoute from './api/user/login_check.js';
import test1Route from './api/test/test1.js';
import test2Route from './api/test/test2.js';
import test3Route from './api/test/test3.js';
import test4Route from './api/test/test4.js';

app.use('/api/post', post_createRoute);
app.use('/api/user', loginRoute, logoutRoute, login_checkRoute);
app.use('/api/test', test1Route, test2Route, test3Route, test4Route);

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

const server = http.createServer(app);  // 追加

// WebSocketサーバーを設定
post_wsRoute(server);  // 修正

server.listen(port, () => {  // 修正
    console.log(`Express app listening on port ${port}`);
});