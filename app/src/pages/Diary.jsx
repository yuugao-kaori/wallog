import React from 'react';

function Diary() {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Diary</h1>
      <p className="text-lg">ここに日記の投稿を表示します。</p>
      {/* 後にServer-Sent Eventsでのリアルタイム更新を実装予定 */}
    </div>
  );
}

export default Diary;