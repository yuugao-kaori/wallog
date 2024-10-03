const express = require('express');
const app = express();
const port = 5000;

// bodyParserが必要な場合
app.use(express.json()); 

app.get('/', (req, res) => {
  res.send('<html><body><h1>test</h1></body></html>');
});


// /api/test/test1 エンドポイント
const test1Route = require('./api/test/test1');
app.use('/api/test', test1Route);

// /api/test/test2 エンドポイント
const test2Route = require('./api/test/test2');
app.use('/api/test', test2Route);

// /api/test/test3 エンドポイント
const test3Route = require('./api/test/test3');
app.use('/api/test', test3Route);



app.listen(port, () => {
  console.log(`Express app listening on port ${port}`);
});


