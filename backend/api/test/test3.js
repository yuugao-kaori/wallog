// /api/test/test2.js
// .envの接続テスト

import express from 'express';
import fs from 'fs';
import dotenv from 'dotenv';
const router = express.Router();

const envFilePath = './.env';

router.get('/test3', (req, res) => {
    if (fs.existsSync(envFilePath)) {
        dotenv.config();
        console.log('.envファイルを認識しました。');
        const { APP_ADMIN_USER, APP_ADMIN_PASSWORD } = process.env;
        res.send(`APP_ADMIN_USER:${APP_ADMIN_USER}\nAPP_ADMIN_PASSWORD:${APP_ADMIN_PASSWORD}`);
    }else{
        return res.status(400).send('error');
    }
});

export default router;