const express = require('express');
const argon2 = require('argon2');
const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '../../../../.env' });

const app = express();
app.use(express.json()); // JSON形式のリクエストをパース
app.use(express.urlencoded({ extended: true })); // URLエンコードされたデータをパース

// PostgreSQLクライアントの設定
const client = new Client({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_NAME,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

client.connect();

// ログインエンドポイント
app.post('/api/user/login', async (req, res) => {
  const { user_id, user_password } = req.body;

  try {
    // user_idに基づいてデータベースからuser_saltとuser_passwordを取得
    const query = 'SELECT user_salt, user_password FROM users WHERE user_id = $1';
    const result = await client.query(query, [user_id]);

    if (result.rows.length === 0) {
      // ユーザーが見つからない場合
      return res.status(401).json({ error: 'Invalid user_id or password' });
    }

    const { user_salt, user_password: hashedPassword } = result.rows[0];

    // 入力されたパスワードを取得したソルトでハッシュ化
    const hash = await argon2.hash(user_password, {
      salt: Buffer.from(user_salt, 'hex'),
      type: argon2.argon2id,
      timeCost: 30000,
    });

    // データベースに保存されているパスワードとハッシュされたパスワードを比較
    if (hash === hashedPassword) {
      return res.status(200).json({ message: 'Login successful' });
    } else {
      return res.status(401).json({ error: 'Invalid user_id or password' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// サーバーをポート3000で起動
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
