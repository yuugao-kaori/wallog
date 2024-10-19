import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import pkg from 'pg';
const { Client } = pkg;
import cors  from 'cors';
const router = express.Router();
const app = express();

// bodyParserが必要な場合
app.use(express.json());

// Redisクライアント作成
const redis = new Redis({
  port: 6379,
  host: "redis", // Redisコンテナの名前
});

// express-sessionの設定
router.use(
  session({
    store: new RedisStore({ client: redis }),
    secret: 'my_secret_key', // 任意のシークレットキー
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 1440 * 60 * 1000, // 1000日間セッションを保持
      httpOnly: true,
      secure: false, // テスト環境用にsecureはfalse
    },
    rolling: true, // セッションアクティビティでセッションを更新
  })
);

// セッション確認APIの実装
router.post('/post_create', async (req, res) => {
  // セッションが存在しない場合
  if (!req.session) {
    console.error('Session object is not found.');
    return res.status(401).json({ error: 'Session object not found' });
  }

  // セッションIDを取得
  const sessionId = req.sessionID;
  console.log(`Session ID: ${sessionId}`);

  try {
    // Redisからセッション情報を取得
    const sessionData = await redis.get(`sess:${sessionId}`);
    
    if (!sessionData) {
      console.warn('No session data found in Redis for this session ID.');
      return res.status(401).json({ error: 'No session data found' });
    }

    // セッションデータをパースして userId を確認
    const parsedSession = JSON.parse(sessionData);
    
    if (!parsedSession.username) {
      console.warn('Session exists, but userId is not set.');
      return res.status(401).json({ error: 'User not logged in' });
    }

    // 成功レスポンス
    console.log(`Session check successful: username = ${parsedSession.username}`);

    // 環境変数の読み取り実装
    const envFilePath = './.env';

    if (fs.existsSync(envFilePath)) {
        dotenv.config();
        console.log('.envファイルを認識しました。');
        const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_NAME } = process.env;
        
        const client = new Client({
            user: POSTGRES_USER,
            host: POSTGRES_NAME,
            database: POSTGRES_DB,
            password: POSTGRES_PASSWORD,
            port: 5432,
        });

        // postテーブルに対する書き込み実装

        const date = new Date();
        const now = formattedDateTime(date);
        const randomDigits = Math.floor(Math.random() * 1000000).toString().padStart(6, '0'); // 6桁の乱数
        const post_id = now + randomDigits
        console.log(post_id)
        console.log(req.body.post_text);


        const post_text_mid = req.body.post_text;
        let post_tag;
        
        post_tag = post_text_mid.match(/(?<=\s|^)#\S+(?=\s|$)/g);
        if (post_tag) {
          console.log("抽出されたハッシュタグ:", post_tag);
        } else {
          console.log("ハッシュタグは抽出されませんでした。");
          post_tag = 'none_data';
        }
        
        function formattedDateTime(date) {
            const y = date.getFullYear();
            const m = ('0' + (date.getMonth() + 1)).slice(-2);
            const d = ('0' + date.getDate()).slice(-2);
            const h = ('0' + date.getHours()).slice(-2);
            const mi = ('0' + date.getMinutes()).slice(-2);
            const s = ('0' + date.getSeconds()).slice(-2);
        
            return y + m + d + h + mi + s;
        }
        async function insertPost(postText, file_id) {

                            
            // クライアントを接続
            await client.connect();
            console.log('PostgreSQLに接続しました。');
            const query = `
                INSERT INTO post (post_id, user_id, post_text, post_tag, post_file, post_attitude)
                VALUES ($1, $2, $3, $4, $5, 1)
                RETURNING *;
                `;
            
            const values = [post_id, parsedSession.username, postText, post_tag, file_id];
            
            try {
                
                const result = await client.query(query, values);
                if (result && result.rows && result.rows.length > 0) {
                    console.log('Post inserted:', result.rows[0]);
                    return result.rows[0];
                } else {
                    throw new Error('No rows returned from the query');
                }
            } catch (err) {
                throw err;
            } finally {
                await client.end();
            }
            
        }
        
        // 使用例
        
        (async () => {
            try {
                console.log('async_ok');
                             
                const newPost = await insertPost(req.body.post_text, req.body.post_file);
                console.log('New post:', newPost);
                return res.status(200).json({ created_note: newPost });

            } catch (err) {
                console.error('Error:', err);
                return res.status(500).json({ error: err });
            }
        })();
        


    }

  } catch (error) {
    console.error('Error while retrieving session from Redis:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.use('', router);

export default app;

