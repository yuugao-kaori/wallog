

import express from 'express';
import session from 'express-session';

const app = express();
const port = 5000;
// CORSの設定
import cors  from 'cors';
app.use(cors({
    origin: 'http://192.168.1.148:23000', // Reactの開発サーバのURLを指定
    credentials: true, // クッキーの送信が必要ならばtrueにする
  }));
app.options('*', cors()); // 全てのルートでOPTIONSメソッドに対してCORS対応


// bodyParserが必要な場合
app.use(express.json());



app.get('/', (req, res) => {
  res.send('<html><body><h1>test</h1></body></html>');
});


// /api/test/test1 エンドポイント
import loginRoute from'./api/post/post_create.js';
app.use('/post/post_create', loginRoute);

// /api/test/test1 エンドポイント
import loginRoute from'./api/user/login.js';
app.use('/api/user', loginRoute);

// /api/test/test1 エンドポイント
import logoutRoute from'./api/user/logout.js';
app.use('/api/user', logoutRoute);

// /api/test/test1 エンドポイント
import test1Route from'./api/test/test1.js';
app.use('/api/test', test1Route);

// /api/test/test2 エンドポイント
import test2Route from'./api/test/test2.js';
app.use('/api/test', test2Route);

// /api/test/test3 エンドポイント
import test3Route from'./api/test/test3.js';
app.use('/api/test', test3Route);

// /api/test/test3 エンドポイント
import test4Route from'./api/test/test4.js';
app.use('/api/test', test4Route);

app.listen(port, () => {
  console.log(`Express app listening on port ${port}`);
});


