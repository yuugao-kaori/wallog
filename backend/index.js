import express from 'express';
import session from 'express-session';
import cors from 'cors';

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
import post_wsRoute from './api/post/post_ws.js';
import loginRoute from './api/user/login.js';
import logoutRoute from './api/user/logout.js';
import test1Route from './api/test/test1.js';
import test2Route from './api/test/test2.js';
import test3Route from './api/test/test3.js';
import test4Route from './api/test/test4.js';

app.use('/api/post', post_createRoute, post_wsRoute);
app.use('/api/user', loginRoute, logoutRoute);
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

app.listen(port, () => {
    console.log(`Express app listening on port ${port}`);
});