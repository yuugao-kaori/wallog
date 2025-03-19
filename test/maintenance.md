# Gitであれこれ
git add . && git commit -m "
'Dev 2025.03.04.0029'
- TODOにおいて、正常な日本時間を使用するように
- TODOにおいて、期限毎に区切りを入れるように
- Diary.mdを更新
- Blog.mdを作成" && git push -u origin nextjs_test
# tar.gzの中身を見る
tar ztf app.tar.gz

# appだけ再起動
docker compose stop app && docker compose rm -f app && docker compose up -d app
docker compose stop backend && docker compose rm -f backend && docker compose up -d backend
docker compose stop nginx && docker compose rm -f nginx && docker compose up -d nginx
docker logs --tail 500 backend_unique


# コンテナでコード実行
docker exec -i app-afm sh -c "node import_note_menu.js"
docker exec -i app_unique sh -c "npm test"


# Docker関連のメンテナンス
## データベースのバックアップ
 docker exec db_unique pg_dump -U myuser mydatabase > ./backup/my_database
_backup.sql
## データベースの消去
 docker exec -i db_unique psql -U myuser -d mydatabase -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
## データベースのレストア
 docker exec -i db_unique psql -U myuser mydatabase < ./backup/my_database_backup.sql


## バックアップ
docker run --rm \
  --volumes-from backend \
  -v $(pwd)/backup:/backup \
  alpine \
  tar czf /backup/app_data_backup.tar.gz /usr/src/app_data

## レストア
docker run --rm \
  --volumes-from backend_unique \
  -v $(pwd)/backup:/backup \
  alpine \
  sh -c "cd / && tar xzf /backup/app_data_backup.tar.gz"



・ファイルのアップロード中、robots.txt、サイトマップ、RSS（二つ）、検索js、




関数や型、APIの想定レスポンスなど、コードの仕様をJSDocで記述してください。






# 概要
これは、Blogの作成体験と編集体験を向上させるためのページです。
これまで、../components/Blogformpopup.tsxを使用していましたが、これを新しいページに置き換えます。

# UIの仕様
- 上部にあるドロップダウンで編集するブログ記事を選択する（blog_listで取得できる分について）
  - または自由入力で作成を行なう
  - 取得しきれない分については、blog_idで指定できるようにする（/blog/[blog_id]/page.tsxで表示されるブログ記事からこのblog_editerページに遷移してそのまま編集出来る構造が理想です）
- MD記法・カスタム記法を上部にあるボタンで入力する機能
- 箇条書き（数字付き、数字なし）のオートコンプリート
- 自動入力とオートコンプリートをCtrl＋zでロールバックする機能
- 入力と編集の履歴をエディター上のUIで確認できる機能
- 画像を「ドラッグ&ドロップ・端末から選択」して新規アップロードするか、「アップロード済みファイル」からモーダルを起動して取得するかして、画像を投稿することができる機能
- ハッシュタグ（複数選択可能）とブログのサムネイルを指定することができる機能


# 対応するMD記法・カスタム記法
- 「#」、「##」、「###」による見出し（h3に相当するところまで）
- 「ｰ 」、「1. 」による箇条書き（数字付き、数字なし）
- 「**太字**」による太字
- 「*斜体*」による斜体
- 「__下線__」による下線
- 「~~取り消し線~~」による取り消し線
- 「---」による水平線
- 「>」による引用
- 「```code```」による複数行コードブロック
- 「`code`」による行内のコードブロック
- 「<img=file_id>」による画像添付

# エディタで対応する必要は無いが、仕様として存在しているMD記法・カスタム記法
- 「https://example.com」によるリンク（URL単体でリンクを生成）
- 「<iframe src="https://example.com"></iframe>」によるIFRAME表示