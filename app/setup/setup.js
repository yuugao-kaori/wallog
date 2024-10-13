const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');
console.log('\n############################\nセットアップ処理を開始します\n############################\n');

const envFilePath = './.env';

if (fs.existsSync(envFilePath)) {
  dotenv.config();
  console.log('.envファイルを認識しました。\n');
  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_NAME } = process.env;

  const client = new Client({
    user: POSTGRES_USER,
    host: POSTGRES_NAME,
    database: POSTGRES_DB,
    password: POSTGRES_PASSWORD,
    port: 5432,
  });

  async function checkTableExists() {
    try {
      // データベースに接続
      await client.connect();

      // postテーブルが存在するかを確認するクエリ
      const res = await client.query(`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'post'
        );
      `);

      if (res.rows[0].exists) {
        console.log('動作に必要なテーブルの存在を確認しました。');
      } else {
        console.log('動作に必要なテーブルが存在しません。\nテーブル作成を実行します。');

        // ./setup/init.sqlを実行
        const sqlFilePath = path.join(__dirname, './init.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf8');
        
        console.log('データベースにテーブル作成SQLを実行します。');
        await client.query(sql);
        console.log('テーブル作成SQLを実行し、テーブルが作成されました。');
      }





    // トリガーが存在するかを確認するクエリ
    const checkTrigger = `
      SELECT tgname 
      FROM pg_trigger 
      WHERE tgname = 'post_update_trigger';
    `;

    try {
      const res = await client.query(checkTrigger);

      if (res.rows.length === 0) {
        console.log('トリガーが存在しません。新規作成します。');

        const notify = `
        CREATE OR REPLACE FUNCTION notify_post_update()
        RETURNS TRIGGER AS $$
        BEGIN
          PERFORM pg_notify('post_updates', 'Post updated');
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    
        CREATE TRIGGER post_update_trigger
        AFTER INSERT OR UPDATE ON post
        FOR EACH ROW EXECUTE FUNCTION notify_post_update();
      `;
      await client.query(notify);
      console.log('トリガーが作成されました');
      } else {
        console.log('トリガーは既に存在しています。');
      }
    } catch (error) {
      console.error('トリガーの確認中にエラーが発生しました:', error);
    }


      // 管理者ユーザーの作成

      const { APP_ADMIN_USER, APP_ADMIN_PASSWORD } = process.env;
      const now = new Date();
      const checkAdminUserQuery = 'SELECT user_id FROM "user" WHERE user_id = $1';
      const result = await client.query(checkAdminUserQuery, [APP_ADMIN_USER]);
      if (result.rows.length === 0) {
        console.log(`.envで定義された管理者ユーザーがテーブルに存在しません。\n初期ユーザの作成処理を行います。`);
      const insert_sql = `
      INSERT INTO "user" (
        user_id, 
        user_password, 
        user_salt, 
        user_birth,
        user_icon,
        user_mail,
        user_attitude,
        user_prof,
        user_createat,
        user_updateat,
        user_failcount,
        user_token
      ) VALUES ($1, $2, 'salt', null, 'none_data', 'none_data', null, 'none_data', $3, $4, 0, 'none_data');
    `;
      
      await client.query(insert_sql, [APP_ADMIN_USER, APP_ADMIN_PASSWORD, now, now]);
      console.log(`管理者ユーザーが作成されました。ユーザID：'${APP_ADMIN_USER}'`);
    } else {
      console.log(`管理者ユーザーの存在を確認しました。ユーザID：'${APP_ADMIN_USER}'`);
  }
    } catch (err) {
      console.error('SQL実行中にエラーが発生しました:', err);
    } finally {
      // 接続を終了
      await client.end();
    }
  }

  // 関数を実行
  checkTableExists();

} else {
  console.log('.envファイルが見つかりませんでした。');
}
