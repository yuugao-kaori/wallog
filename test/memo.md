1. 
2. Tagについて、中間テーブルに収容する
3. タグ検索APIを実装
4.  タグフロントエンドの実装
5.  URLコピーの実装
6.  修正の実装
7.  

通常ページのノンタグ
10行以上が折りたたまれる
通常ページのブログタグ


ブログタグ専用ページ
文中に画像を貼ることが許可される










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