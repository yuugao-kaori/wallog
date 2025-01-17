
import express from 'express';
import pkg from 'pg';
import dotenv from 'dotenv';

const { Client } = pkg;
const router = express.Router();
dotenv.config();

router.get('/hashtag_rank', async (req, res) => {
    const { limit = 20 } = req.query;
    const numericLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    const client = new Client({
        user: process.env.POSTGRES_USER,
        host: process.env.POSTGRES_NAME,
        database: process.env.POSTGRES_DB,
        password: process.env.POSTGRES_PASSWORD,
        port: 5432,
    });

    try {
        await client.connect();

        const query = `
            SELECT pt.post_tag_id, pt.post_tag_text, COUNT(*) as use_count
            FROM "posts_post_tags" ppt
            JOIN "post_tag" pt ON ppt.post_tag_id = pt.post_tag_id
            GROUP BY pt.post_tag_id, pt.post_tag_text
            ORDER BY use_count DESC
            LIMIT $1
        `;

        const result = await client.query(query, [numericLimit]);
        res.status(200).json(result.rows);

    } catch (error) {
        console.error('Error fetching hashtag ranking:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        await client.end();
    }
});

export default router;