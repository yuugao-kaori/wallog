// /api/test/test2.js
// リクエストボディ

const express = require('express');
const router = express.Router();

router.post('/test2', (req, res) => {
  const { test_body1 } = req.body;

  if (!test_body1) {
    return res.status(400).send('test_body1 is required');
  }
  console.log('catch_OK:${test_body1}');
  res.send(`catch_OK:${test_body1}`);
});

module.exports = router;