# Gitであれこれ
git add . && git commit -m "
'Build 2025.04.01.0002'
- DiaryのActivityPub対応の初期実装
  - domain/@adminでフォローを実行できる機能
- 【既知の問題】投稿ができない" && git push -u origin nextjs_test
# tar.gzの中身を見る
tar ztf app.tar.gz

# appだけ再起動
docker compose stop app && docker compose rm -f app && docker compose up -d app && docker logs -f app_unique
docker compose stop app && docker compose rm -f app && docker compose up -d app 

docker compose stop backend && docker compose rm -f backend && docker compose up -d backend && docker logs -f backend_unique
docker compose stop nginx && docker compose rm -f nginx && docker compose up -d nginx
docker logs --tail 500 backend_unique

docker exec -it app_unique sh
docker exec -it backend_unique sh


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





