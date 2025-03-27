import express from 'express';
import session from 'express-session';
import Redis from "ioredis";
import RedisStore from "connect-redis";
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv'; // dotenvをインポート
import pkg from 'pg';
import sharp from 'sharp'; // sharpをインポート
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'; // AWS SDKをインポート
import exifReader from 'exif-reader'; // EXIFデータを解析するためのライブラリをインポート

const { Client } = pkg; // pgライブラリからClientをインポート

const router = express.Router();
console.log('file_create:wakeup!');

// ESM環境での__dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Redisクライアント作成
const redis = new Redis({
  port: 6379,
  host: "redis", // Redisコンテナの名前
});

// express-sessionの設定
router.use(
  session({
    store: new RedisStore({ client: redis }),
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 60 * 1000,
      httpOnly: true,
      secure: false,
    },
    rolling: true,
  })
);

// 環境変数の読み取り実装
const envFilePath = './.env';
dotenv.config({ path: envFilePath }); // dotenvを使用して環境変数を読み込み

/**
 * 文字列からヌル文字を削除し、トリミングする関数
 * @param {string|null} str - 処理する文字列
 * @returns {string|null} - 処理後の文字列
 */
function cleanString(str) {
  if (str === null || str === undefined) return null;
  if (typeof str !== 'string') return String(str);
  
  // ヌル文字(\u0000)を削除し、前後の空白をトリム
  return str.replace(/\u0000/g, '').trim();
}

async function insertPost(file_id, user_name, file_size, file_format, original_name, exifData = {}, exifPublic = false, gpsPublic = false, file_exif_title = null) {
  // exifDataの文字列フィールドをクリーニング
  const cleanedExifData = {
    ...exifData,
    make: cleanString(exifData.make),
    model: cleanString(exifData.model),
    datetime: cleanString(exifData.datetime),
    exposureTime: cleanString(exifData.exposureTime),
    focalLength: cleanString(exifData.focalLength),
    colorSpace: cleanString(exifData.colorSpace)
  };

  // file_exif_titleをクリーニング
  const cleanedTitle = cleanString(file_exif_title);

  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_NAME } = process.env;

  const client = new Client({
    user: POSTGRES_USER,
    host: POSTGRES_NAME,
    database: POSTGRES_DB,
    password: POSTGRES_PASSWORD,
    port: 5432,
  });

  // クライアントを接続
  await client.connect();
  console.log('PostgreSQLに接続しました。');
  const query = `
      INSERT INTO drive (
        file_id, user_id, file_size, file_format, file_originalname, file_attitude,
        file_exif_public, file_exif_datetime, file_exif_gps_latitude, file_exif_gps_longitude, 
        file_exif_gps_altitude, file_exif_gps_public, file_exif_image_direction, file_exif_make, 
        file_exif_model, file_exif_xresolution, file_exif_yresolution, file_exif_resolution_unit, 
        file_exif_exposure_time, file_exif_fnumber, file_exif_iso, file_exif_metering_mode, 
        file_exif_flash, file_exif_exposure_compensation, file_exif_focal_length, file_exif_color_space,
        file_exif_title
      )
      VALUES (
        $1, $2, $3, $4, $5, 1, 
        $6, $7, $8, $9, 
        $10, $11, $12, $13, 
        $14, $15, $16, $17, 
        $18, $19, $20, $21, 
        $22, $23, $24, $25,
        $26
      )
      RETURNING *;
      `;
  const values = [
    file_id, 
    user_name, 
    file_size, 
    file_format, 
    original_name,
    exifPublic,
    cleanedExifData.datetime || null,
    cleanedExifData.gpsLatitude || null,
    cleanedExifData.gpsLongitude || null,
    cleanedExifData.gpsAltitude || null,
    gpsPublic,
    cleanedExifData.imageDirection || null,
    cleanedExifData.make || null,
    cleanedExifData.model || null,
    cleanedExifData.xResolution || null,
    cleanedExifData.yResolution || null,
    cleanedExifData.resolutionUnit || null,
    cleanedExifData.exposureTime || null,
    cleanedExifData.fNumber || null,
    cleanedExifData.iso || null,
    cleanedExifData.meteringMode || null,
    cleanedExifData.flash || null,
    cleanedExifData.exposureCompensation || null,
    cleanedExifData.focalLength || null,
    cleanedExifData.colorSpace || null,
    cleanedTitle
  ];

  try {
    const result = await client.query(query, values);
    if (result && result.rows && result.rows.length > 0) {
      console.log('Post inserted:', result.rows[0]);
      return result.rows[0];
    } else {
      throw new Error('No rows returned from the query');
    }
  } catch (err) {
    throw err;
  } finally {
    await client.end();
  }
}

// ストレージの設定
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.resolve(__dirname, '../../../app_data');
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// MinIOクライアントの初期化部分を置き換え
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

// EXIF日時情報をTIMESTAMP型に変換する関数
function convertExifDateTimeToTimestamp(exifDateTime) {
  // 値がない場合はnullを返す
  if (!exifDateTime) {
    return null;
  }

  // 既にDateオブジェクトの場合はそのまま文字列に変換
  if (exifDateTime instanceof Date) {
    return exifDateTime.toISOString().replace('T', ' ').replace('Z', '');
  }
  
  // Bufferオブジェクトの場合は処理をスキップ
  if (Buffer.isBuffer(exifDateTime) || 
      (exifDateTime && typeof exifDateTime === 'object' && exifDateTime.type === 'Buffer')) {
    console.log('Buffer型のexifDateTimeを処理できません:', exifDateTime);
    return null;
  }

  try {
    // 文字列の場合
    if (typeof exifDateTime === 'string') {
      // 標準的なEXIF形式 "YYYY:MM:DD HH:MM:SS" を処理
      if (exifDateTime.includes(':') && exifDateTime.includes(' ')) {
        const [datePart, timePart] = exifDateTime.split(' ');
        if (datePart && timePart) {
          const [year, month, day] = datePart.split(':');
          return `${year}-${month}-${day} ${timePart}`;
        }
      }
      
      // ISO形式の場合はそのまま使用
      if (exifDateTime.includes('T') && (exifDateTime.includes('Z') || exifDateTime.includes('+'))) {
        return exifDateTime.replace('T', ' ').replace('Z', '');
      }
      
      // その他の形式の文字列の場合はDateオブジェクトに変換を試みる
      const dateObj = new Date(exifDateTime);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().replace('T', ' ').replace('Z', '');
      }
    }
    
    // 数値の場合はUNIXタイムスタンプとして解釈
    if (typeof exifDateTime === 'number') {
      const dateObj = new Date(exifDateTime);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().replace('T', ' ').replace('Z', '');
      }
    }
    
    // 配列の場合（時間の各部分が配列で提供される場合）
    if (Array.isArray(exifDateTime) && exifDateTime.length >= 3) {
      // [year, month, day, hour, minute, second]の形式を仮定
      const dateObj = new Date(
        exifDateTime[0],
        exifDateTime[1] - 1,
        exifDateTime[2],
        exifDateTime[3] || 0,
        exifDateTime[4] || 0,
        exifDateTime[5] || 0
      );
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().replace('T', ' ').replace('Z', '');
      }
    }

    console.log('サポートされていないEXIF日時形式:', exifDateTime);
    return null;
  } catch (error) {
    console.error('EXIF日時の変換に失敗:', error);
    return null;
  }
}

// ファイルアップロード処理
const fileCreateHandler = (req, res, user_name) => {
  upload.single('file')(req, res, async function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      console.log('async_ok');
      let file_id = path.basename(req.file.path); // ファイル名を取得
      const file_size = req.file.size; // ファイルのサイズを取得
      let file_format = path.extname(req.file.originalname); // ファイルの拡張子を取得
      const original_name = req.file.originalname; // 追加

      // EXIFデータを保存するオブジェクト
      let exifData = {};
      // リクエストボディからfile_exif_publicとfile_gps_publicを取得
      const exifPublic = req.body.file_exif_public === 'true' || req.body.file_exif_public === true;
      const gpsPublic = req.body.file_gps_public === 'true' || req.body.file_gps_public === true;
      // リクエストボディからfile_exif_titleを取得
      const fileExifTitle = req.body.file_exif_title || null;
      
      // 画像ファイルの場合はWebPに変換と同時にEXIF情報を抽出
      if (req.file.mimetype.startsWith('image/')) {
        try {
          // EXIF情報を抽出
          const metadata = await sharp(req.file.path).metadata();
          console.log('EXIF情報取得:', metadata);
          
          if (metadata) {
            // カラースペース情報を保存
            exifData.colorSpace = metadata.space || null;

            // 解像度情報を保存
            exifData.xResolution = metadata.xResolution || null;
            exifData.yResolution = metadata.yResolution || null;
            exifData.resolutionUnit = metadata.resolutionUnit || null;
            
            // 向き情報を保存
            exifData.imageDirection = metadata.orientation || null;
            
            // EXIF詳細データの解析
            if (metadata.exif) {
              try {
                const exifBuffer = metadata.exif;
                const exifDataParsed = exifReader(exifBuffer);
                console.log('パースされたEXIF情報:', JSON.stringify(exifDataParsed, null, 2));
                
                // 日時情報（Photo.DateTimeOriginalまたはImage.DateTimeを使用）
                if (exifDataParsed.Photo && exifDataParsed.Photo.DateTimeOriginal) {
                  // 日時情報を適切な形式に変換
                  exifData.datetime = convertExifDateTimeToTimestamp(exifDataParsed.Photo.DateTimeOriginal);
                } else if (exifDataParsed.Image && exifDataParsed.Image.DateTime) {
                  // 日時情報を適切な形式に変換
                  exifData.datetime = convertExifDateTimeToTimestamp(exifDataParsed.Image.DateTime);
                }
                
                // カメラ情報（Imageから取得）
                if (exifDataParsed.Image) {
                  exifData.make = exifDataParsed.Image.Make || null;
                  exifData.model = exifDataParsed.Image.Model || null;
                  
                  // 向き情報
                  if (exifDataParsed.Image.Orientation) {
                    exifData.imageDirection = String(exifDataParsed.Image.Orientation);
                  }
                  
                  // 解像度情報
                  exifData.xResolution = exifDataParsed.Image.XResolution || null;
                  exifData.yResolution = exifDataParsed.Image.YResolution || null;
                  if (exifDataParsed.Image.ResolutionUnit) {
                    if (exifDataParsed.Image.ResolutionUnit === 2) {
                      exifData.resolutionUnit = 'inch';
                    } else if (exifDataParsed.Image.ResolutionUnit === 3) {
                      exifData.resolutionUnit = 'cm';
                    }
                  }
                }
                
                // 撮影設定情報（Photoから取得）
                if (exifDataParsed.Photo) {
                  if (exifDataParsed.Photo.ExposureTime) {
                    exifData.exposureTime = String(exifDataParsed.Photo.ExposureTime);
                  }
                  if (exifDataParsed.Photo.FNumber) {
                    exifData.fNumber = exifDataParsed.Photo.FNumber;
                  }
                  exifData.iso = exifDataParsed.Photo.ISOSpeedRatings || null;
                  exifData.meteringMode = exifDataParsed.Photo.MeteringMode || null;
                  exifData.flash = exifDataParsed.Photo.Flash || null;
                  
                  if (exifDataParsed.Photo.ExposureBiasValue !== undefined) {
                    exifData.exposureCompensation = exifDataParsed.Photo.ExposureBiasValue;
                  }
                  
                  if (exifDataParsed.Photo.FocalLength) {
                    exifData.focalLength = `${exifDataParsed.Photo.FocalLength}mm`;
                  }
                }
                
                // GPS情報（GPSInfoから取得）
                if (exifDataParsed.GPSInfo) {
                  console.log('GPS情報発見:', JSON.stringify(exifDataParsed.GPSInfo, null, 2));
                  
                  // 緯度の処理
                  if (exifDataParsed.GPSInfo.GPSLatitude && Array.isArray(exifDataParsed.GPSInfo.GPSLatitude)) {
                    // 度分秒形式から10進数に変換
                    const latValues = exifDataParsed.GPSInfo.GPSLatitude;
                    let latitude = latValues[0] + (latValues[1] / 60) + (latValues[2] / 3600);
                    
                    // 南緯の場合は負の値にする
                    if (exifDataParsed.GPSInfo.GPSLatitudeRef === 'S') {
                      latitude = -latitude;
                    }
                    exifData.gpsLatitude = latitude;
                  }
                  
                  // 経度の処理
                  if (exifDataParsed.GPSInfo.GPSLongitude && Array.isArray(exifDataParsed.GPSInfo.GPSLongitude)) {
                    // 度分秒形式から10進数に変換
                    const lonValues = exifDataParsed.GPSInfo.GPSLongitude;
                    let longitude = lonValues[0] + (lonValues[1] / 60) + (lonValues[2] / 3600);
                    
                    // 西経の場合は負の値にする
                    if (exifDataParsed.GPSInfo.GPSLongitudeRef === 'W') {
                      longitude = -longitude;
                    }
                    exifData.gpsLongitude = longitude;
                  }
                  
                  // 高度の処理
                  if (exifDataParsed.GPSInfo.GPSAltitude !== undefined) {
                    let altitude = exifDataParsed.GPSInfo.GPSAltitude;
                    // 高度の基準が海抜以下の場合はマイナス値にする
                    if (exifDataParsed.GPSInfo.GPSAltitudeRef === 1) {
                      altitude = -altitude;
                    }
                    exifData.gpsAltitude = altitude;
                  }
                }
              } catch (exifError) {
                console.warn('EXIF情報の抽出に失敗:', exifError);
              }
            }
          }
        } catch (exifError) {
          console.warn('EXIF情報の抽出に失敗しました:', exifError);
          // エラーがあっても処理は継続
        }
        
        const webpPath = `${req.file.path}.webp`;
        await sharp(req.file.path)
          .webp({ quality: 80 }) // 圧縮品質を設定
          .toFile(webpPath);
        console.log(`WebPに変換しました: ${webpPath}`); // 変換後のファイルパスをログ
        // ファイルパスとfile_idを.webp付きに更新
        file_id = path.basename(webpPath);
        file_format = '.webp';
      }

      // MinIOへのアップロード処理を更新
      const fileContent = fs.readFileSync(req.file.path);
      await s3Client.send(new PutObjectCommand({
        Bucket: 'publicdata',
        Key: file_id,
        Body: fileContent
      }));
      console.log(`MinIOにファイルをアップロードしました: publicdata/${file_id}`);

      // EXIF情報を含めてデータベースに保存
      const new_file = await insertPost(
        file_id, 
        user_name, 
        file_size, 
        file_format, 
        original_name, 
        exifData, 
        exifPublic, 
        gpsPublic,
        fileExifTitle // file_exif_titleパラメータを追加
      );
      
      console.log('New file:', new_file);

      return res.status(200).json({
        message: 'File uploaded successfully',
        filePath: req.file.path,
        file_id: file_id // ここにfile_idを含むURLを追加
      });

    } catch (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: err.message });
    }
  });
};


router.post('/file_create', async (req, res) => {
  if (!req.session) {
    console.error('Session object is not found.');
    return res.status(401).json({ error: 'Session object not found' });
  }

  const sessionId = req.sessionID;
  console.log(`Session ID: ${sessionId}`);

  try {
    const sessionData = await redis.get(`sess:${sessionId}`);
    console.log('sessionId:', sessionId);
    console.log('sessionData:', sessionData);
    
    if (!sessionData) {
      console.warn('No session data found in Redis for this session ID.');
      return res.status(401).json({ error: 'No session data found' });
    }

    const parsedSession = JSON.parse(sessionData);
    console.log('parsedSession.username:', parsedSession.username);
    if (!parsedSession.username) {
      console.warn('Session exists, but userId is not set.');
      return res.status(401).json({ error: 'User not logged in' });
    }

    console.log(`Session check successful: username = ${parsedSession.username}`);
    fileCreateHandler(req, res, parsedSession.username);
  } catch (error) {
    console.error('Error while retrieving session from Redis:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
