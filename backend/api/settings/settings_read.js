import express from 'express';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;

dotenv.config();
const router = express.Router();

router.get('/settings_read', async (req, res) => {
    const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_NAME } = process.env;

    const client = new Client({
        user: POSTGRES_USER,
        host: POSTGRES_NAME,
        database: POSTGRES_DB,
        password: POSTGRES_PASSWORD,
        port: 5432,
    });

    try {
        await client.connect();
        console.log('PostgreSQLに接続しました。');

        const query = `
            SELECT settings_key, settings_value
            FROM settings
            ORDER BY settings_key;
        `;

        const result = await client.query(query);
        return res.status(200).json(result.rows);

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    } finally {
        await client.end();
        console.log('PostgreSQL connection closed');
    }
});

export default router;
