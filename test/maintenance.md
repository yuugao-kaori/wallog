# Gitであれこれ
git add . && git commit -m "
'Dev 2025.03.04.0008'
ｰ 検索APIをall_searchに統合
ｰ Blogのタイトル・タグ・全文検索を目指した改修
ｰ 【既知の問題】Blogの検索機能が実質的に未実装
ｰ 【既知の問題】Diaryにおいて「人気のハッシュタグ」が添付できない
ｰ 【既知の問題】DiaryにおいてCtrl＋Vで画像の貼り付けができない（APIが走らない）
ｰ 【既知の問題】Searchページのデザインがダサい" && git push -u origin nextjs_test

# tar.gzの中身を見る
tar ztf app.tar.gz

# appだけ再起動
docker compose stop app && docker compose rm -f app && docker compose up -d app
docker compose stop backend && docker compose rm -f backend && docker compose up -d backend
docker compose stop nginx && docker compose rm -f nginx && docker compose up -d nginx
docker logs --tail 500 backend




# コンテナでコード実行
docker exec -i app-afm sh -c "node import_note_menu.js"

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