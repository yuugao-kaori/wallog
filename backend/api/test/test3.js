// /api/test/test2.js
// .envの接続テスト

const express = require('express');
const fs = require('fs');
const dotenv = require('dotenv');

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

module.exports = router;