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
  region: 'us-east-1', // MinIOではダミーの地域で構いません
  credentials: {
    accessKeyId: process.env.MINIO_USER || 'myuser',
    secretAccessKey: process.env.MINIO_PASSWORD || 'mypassword',
  },
  forcePathStyle: true, // MinIO互換性のために必要
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
      if (error.name !== 'BucketAlreadyExists') {
        throw error;
      }
    }
  } catch (error) {
    console.error(`バケット作成中にエラーが発生しました: ${error}`);
  }
}

async function syncFiles() {
  try {
    await ensureBucketExists('publicdata');

    const listObjectsResponse = await s3Client.send(new ListObjectsV2Command({
      Bucket: 'publicdata',
      MaxKeys: 1000,
      Delimiter: '/'
    }));
    const minioFiles = (listObjectsResponse.Contents || []).map(obj => obj.Key);

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

    console.log('ファイルの同期が完了しました。');
  } catch (error) {
    console.error('ファイルの同期中にエラーが発生しました:', error);
  }
}

syncFiles();
