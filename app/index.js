const express = require('express');
const path = require('path');

const app = express();

// Reactのビルド済みファイルを提供
app.use(express.static(path.join(__dirname, 'client/build')));

// 全てのルートに対して React のindex.htmlを返す
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});