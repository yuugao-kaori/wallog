const express = require('express');
const session = require('express-session');
const app = express();
const port = 5000;
// CORSの設定
const cors = require('cors');
app.use(cors({
    origin: 'http://192.168.1.148:23000', // Reactの開発サーバのURLを指定
    credentials: true, // クッキーの送信が必要ならばtrueにする
  }));
app.options('*', cors()); // 全てのルートでOPTIONSメソッドに対してCORS対応



// bodyParserが必要な場合
app.use(express.json()); 



// express-session設定
app.use(
  session({
    secret: 'my_secret_key', // 任意のシークレットキーを設定
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 60 * 1000, // 30分間セッションを保持
      httpOnly: true,
      secure: false, // テスト環境なのでsecureはfalse（本番ではtrue）
    },
    rolling: true, // セッションがアクティブな間、毎回セッションIDを更新
  })
);



app.get('/', (req, res) => {
  res.send('<html><body><h1>test</h1></body></html>');
});


// /api/test/test1 エンドポイント
const loginRoute = require('./api/user/login');
app.use('/api/user', loginRoute);

// /api/test/test1 エンドポイント
const logoutRoute = require('./api/user/logout');
app.use('/api/user', logoutRoute);

// /api/test/test1 エンドポイント
const test1Route = require('./api/test/test1');
app.use('/api/test', test1Route);

// /api/test/test2 エンドポイント
const test2Route = require('./api/test/test2');
app.use('/api/test', test2Route);

// /api/test/test3 エンドポイント
const test3Route = require('./api/test/test3');
app.use('/api/test', test3Route);



app.listen(port, () => {
  console.log(`Express app listening on port ${port}`);
});


