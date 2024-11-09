   
   
1. ハッシュタグAPIの整備（検索文に＃を自動挿入する？（URIに＃は入れられない）。全文検索から参照する列を変えるだけの変更で実装できる見込み）
7. ハッシュタグフロントエンドの整備（ハッシュタグに紐付け、検索ページで選択できるように）
8. ルートページを何とかする（HelloWorldにはしない。DiaryListの初期取得を配置するとか。
10. ブログに対応する
11. 設定ページに対応する
12. Misskeyからの投稿インポートに対応する（データベースの再整備。reply、renote、Misskey_ID、Misskey_reply、Misskey_renoteId、Misskey_FileURL、Misskey_Import_Attitude、X_ID、X_reply、X_renoteId、X_File、X_Import_Attitudeの各列を追加）。処理は一行ずつ。テキストはテキスト列に収容、CreateAtも同様に収容（変換は実施）、CreateAtから生成したタイムスタンプを新IDとして生成（下六桁はランダム？）、リプライ、リノート、ファイル、旧ID、ファイルURLは新規列に収容。旧ファイルURLからダウンロードを実施してファイルクリエイト&ファイル列に登録。最後に新IDの順番にソート。リプライとリノートは旧ID列で紹介を掛けて新規IDとのリレーションを実施して新リプライと新リノート列に書き込み。

通常ページのノンタグ
10行以上が折りたたまれる
通常ページのブログタグ


ブログタグ専用ページ
文中に画像を貼ることが許可される

  pgsync:
    build:
      context: ./pgsync
      dockerfile: dockerfile.pgsync
    environment:
      PG_HOST: db
      PG_USER: ${POSTGRES_USER}
      PG_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      ELASTICSEARCH_HOST: ${ELASTICSEARCH_HOST}
      ELASTICSEARCH_PORT: ${ELASTICSEARCH_PORT}

    depends_on:
      elasticsearch:
        condition: service_healthy


    healthcheck:
      test: ["CMD", "curl", "<http://localhost:9200>"]
      interval: 1s
      retries: 180





===============
あなたはフルスタックエンジニアです。
既存のReactのコードに、下記の機能を追加して下さい。

================




あなたはフルスタックエンジニアです。
このウェブアプリに、ログイン機能を実装しようと考えています。
Expressを利用してAPIを開発してください。
分からない情報は質問して下さい。正確さを最優先に、一歩一歩考えながら取り組んで下さい。

①PGモジュールを使用して接続する。
※接続情報は「../../../../.env」を読み取る。
====.envの構造====
POSTGRES_NAME=db
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
POSTGRES_DB=mydatabase
====接続に用いるコード====
  const client = new Client({
    user: POSTGRES_USER,
    host: POSTGRES_NAME,
    database: POSTGRES_DB,
    password: POSTGRES_PASSWORD,
    port: 5432,
  });
②受け付けるエンドポイントは、/api/user/login
入力される情報は、user_id,user_password
③要件は
user_passwordをハッシュ化する
	- user_saltのソルトを読み込む
	- アルゴリズムはargon2を使用する
	- 30000回ストレッチングを行う
- userテーブルのuser_id行のuser_password列と合致するかを確認する
④合致していたらHTTP200を返却する

- express-sessionを使用してセッション管理を実施する
	- メモリリークの対策としてValkeyにデータを保管する
	- ログインからログアウトまで再ログインは求めないようにする



①画面の右上にログインボタンを設置する
②ログインボタンを押すとユーザ名とパスワードを入力するポップアップが表示される
という二つの機能をまず、実装して下さい。
③入力すると、API（192.168.1.148:23000/api/user/login）にユーザ名とパスワードを送信する
④



Expressを利用したAPIを実装して下さい。

要件は、


＝＝＝＝＝＝＝＝＝＝＝＝
セッション管理の実装順序

1. ストア照合API
   1. コンソール出力させる
   2. test4.js
2. フロントに照合APIの送出ページ作成
   1. /test_console.jsx
3. ヘッダにログイン状態の表記(ログインボタンの削除)
4. セッションストアの導入
5. PG読み込みの実装
6. 
＝＝＝＝＝＝＝＝＝＝＝＝

あなたはフロントエンドエンジニアです。
Nodejsでセッション管理を行うコードを書いて下さい。
フロントエンドはReact(ポート3000)、バックエンドはExpress(ポート5000)、セッションストアはValkey(ポート9000)。
ログイン情報はlocalhost:3000/api/user/loginに送信されます。
セッションはログインからログアウトまで保持してください。

＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝

あなたはフルスタックウェブエンジニアです。
Nodejsでセッション管理(セッションの確認)を行うコードを書いて下さい。
回答は、下記の要件に従って下さい。
1. 回答は、正確さを優先し、ゆっくりと、段階的に考えて下さい。
2. セッションについては、express-sessionモジュールを利用して下さい。
3. テスト実装のため、セッションはインメモリを利用します(外部のストアは使用しません)
4. フロントエンドからCookie付きのリクエストが来たら、Cookieに含まれるセッションIDからユーザIDを返却するAPIを書いて下さい
5. このAPIはindex.jsから読み込まれるjsファイルに記述されます。
6. index.jsは私が記述するのであなたが書く必要はありません。
```
 
```
Express redis Docker #Redis - Qiita
https://qiita.com/kandalog/items/89405c546bfcceab9b50

connect-redisをDockerで使うときに躓いた
https://zenn.dev/akira_kashihara/articles/3ec664e15f561d