const express = require('express');
const app = express();
const port = 5000;

app.use(express.json()); 

app.get('/', (req, res) => {
  res.send('<html><body><h1>test</h1></body></html>');
});


// /api/test/test1 エンドポイント
app.get('/api/test/test1', (req, res) => {
  res.send('test_OK');
  console.log(`api/test/test1 エンドポイント`);
});

// /api/test/test2 エンドポイント
app.post('/api/test/test2', (req, res) => {
  const { test_body1 } = req.body;

  if (!test_body1) {
    return res.status(400).send('test_body1 is required');
  }

  res.send(`catch_OK:${test_body1}`);
});


app.listen(port, () => {
  console.log(`Express app listening on port ${port}`);
});


