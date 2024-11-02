FROM node:22-alpine

# 作業ディレクトリを作成
WORKDIR /usr/src/app

# 依存関係をインストールするためにpackage.jsonとpackage-lock.jsonをコピー
COPY ./app/package**.json ./

# 依存関係をインストール
RUN npm install

# アプリケーションコードをコピー
COPY . .
# .envファイルをコピー
COPY .env ./
COPY ./RDD.md ./

# アプリを開発モードで起動
CMD ["npm", "build"]