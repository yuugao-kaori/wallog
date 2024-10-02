#!/bin/bash
set -e

echo "$POSTGRES_USER"
# PostgreSQLが起動するまでリトライ
# until PGPASSWORD=$POSTGRES_PASSWORD  psql -h localhost -p 5432 -U $POSTGRES_USER -P  -d $POSTGRES_DB -c '\q'; do
until psql -h localhost -p 5432 -U $POSTGRES_USER -d $POSTGRES_DB -c '\q'; do
# until psql postgres -c '\q'; do
  >&2 echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

>&2 echo "PostgreSQL is up - executing command"



# PostgreSQLに接続してテーブルが存在するか確認するクエリ
TABLE_CHECK=$(psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT EXISTS (SELECT FROM pg_tables WHERE tablename='post');")

# テーブルが存在しない場合に初期化スクリプトを実行
if [ "$TABLE_CHECK" = "f" ]; then
  echo "Initializing database..."
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /docker-entrypoint-initdb.d/init.sql
else
  echo "Database already initialized."
fi
