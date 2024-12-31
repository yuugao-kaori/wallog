import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
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

async function ensureBucketExists(bucketName) {
  try {
    try {
      await s3Client.send(new ListBucketsCommand({}));
    } catch (error) {
      console.error('S3への接続に問題があります:', error);
      return;
    }

    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
      console.log(`バケット ${bucketName} を作成しました。`);
    } catch (error) {
      if (error.name !== 'BucketAlreadyExists' && error.Code !== 'BucketAlreadyOwnedByYou') {
        console.log(`バケット ${bucketName} は既に存在します。`);
      }
    }
  } catch (error) {
    console.error(`バケット作成中にエラーが発生しました: ${error}`);
  }
}

async function syncFiles() {
  try {
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

      for (const file of localFiles) {
        if (!minioFiles.includes(file)) {
          const fileContent = fs.readFileSync(path.join(localFilesPath, file));
          await s3Client.send(new PutObjectCommand({
            Bucket: 'publicdata',
            Key: file,
            Body: fileContent
          }));
          console.log(`S3にファイルをアップロードしました: ${file}`);
        }
      }
    }

    console.log('MinIOメンテナンスが完了しました。');
  } catch (error) {
    console.error('MinIOメンテナンス中にエラーが発生しました:', error);
  }
}

export const runMinioMaintenance = async () => {
  console.log('\n############################\nMinIOメンテナンスを開始します\n############################\n');
  await syncFiles();
  console.log('\n############################\nMinIOメンテナンスが完了しました\n############################\n');
};
