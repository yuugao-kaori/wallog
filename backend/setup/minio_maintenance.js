import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;
import { fileURLToPath } from 'url';
import { S3Client, ListBucketsCommand, CreateBucketCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const s3Client = new S3Client({
  endpoint: `http://${process.env.MINIO_NAME}:9000`,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_USER || 'myuser',
    secretAccessKey: process.env.MINIO_PASSWORD || 'mypassword',
  },
  forcePathStyle: true,
  signatureVersion: 'v4',
  tls: false,
  apiVersion: 'latest'
});

const localFilesPath = path.resolve(__dirname, '../../app_data');

// ログ記録関数を追加
async function logMinioAction(level, message, metadata = {}) {
  const pgClient = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_NAME,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  });

  try {
    await pgClient.connect();
    const query = `
      INSERT INTO logs (level, source, message, metadata)
      VALUES ($1, $2, $3, $4)
    `;
    await pgClient.query(query, [
      level,
      'minio_maintenance',
      message,
      JSON.stringify(metadata)
    ]);
  } catch (error) {
    console.error('ログの記録に失敗しました:', error);
  } finally {
    await pgClient.end();
  }
}

async function ensureBucketExists(bucketName) {
  try {
    try {
      await s3Client.send(new ListBucketsCommand({}));
    } catch (error) {
      await logMinioAction('ERROR', 'S3への接続に問題があります', { error: error.message });
      console.error('S3への接続に問題があります:', error);
      return;
    }

    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
      await logMinioAction('INFO', `バケットを作成しました`, { bucket: bucketName });
      console.log(`バケット ${bucketName} を作成しました。`);
    } catch (error) {
      if (error.name !== 'BucketAlreadyExists' && error.Code !== 'BucketAlreadyOwnedByYou') {
        await logMinioAction('INFO', `バケットは既に存在します`, { bucket: bucketName });
        console.log(`バケット ${bucketName} は既に存在します。`);
      }
    }
  } catch (error) {
    await logMinioAction('ERROR', `バケット作成中にエラーが発生しました`, { 
      bucket: bucketName,
      error: error.message 
    });
    console.error(`バケット作成中にエラーが発生しました: ${error}`);
  }
}

async function syncFiles() {
  try {
    await logMinioAction('INFO', 'MinIOファイル同期を開始します');
    const buckets = ['publicdata', 'privatedata', 'bucket3'];
    
    for (const bucket of buckets) {
      await ensureBucketExists(bucket);
    }

    // publicdataバケットとローカルファイルの同期
    const listObjectsResponse = await s3Client.send(new ListObjectsV2Command({
      Bucket: 'publicdata',
      MaxKeys: 1000,
      Delimiter: '/'
    }));
    const minioFiles = (listObjectsResponse.Contents || []).map(obj => obj.Key);

    if (fs.existsSync(localFilesPath)) {
      const localFiles = fs.readdirSync(localFilesPath);
      const uploadedFiles = [];

      for (const file of localFiles) {
        if (!minioFiles.includes(file)) {
          const fileContent = fs.readFileSync(path.join(localFilesPath, file));
          await s3Client.send(new PutObjectCommand({
            Bucket: 'publicdata',
            Key: file,
            Body: fileContent
          }));
          uploadedFiles.push(file);
          console.log(`S3にファイルをアップロードしました: ${file}`);
        }
      }

      if (uploadedFiles.length > 0) {
        await logMinioAction('INFO', 'ファイルのアップロードが完了しました', {
          count: uploadedFiles.length,
          files: uploadedFiles
        });
      }
    }

    await logMinioAction('INFO', 'MinIOメンテナンスが完了しました');
    console.log('MinIOメンテナンスが完了しました。');
  } catch (error) {
    await logMinioAction('ERROR', 'MinIOメンテナンス中にエラーが発生しました', {
      error: error.message
    });
    console.error('MinIOメンテナンス中にエラーが発生しました:', error);
  }
}

export const runMinioMaintenance = async () => {
  console.log('\n############################\nMinIOメンテナンスを開始します\n############################\n');
  await logMinioAction('INFO', 'MinIOメンテナンスを開始します');
  await syncFiles();
  console.log('\n############################\nMinIOメンテナンスが完了しました\n############################\n');
};
