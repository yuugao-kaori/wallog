/*
index.jsx
*/

import './index.css'; 
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';

// 各画面のコンポーネントを定義
const Home = () => <h1>HelloWorld</h1>;
const Test1 = () => <h1>Test 1 Page</h1>;
const Test2 = () => <h1>Test 2 Page</h1>;

const App = () => {
  return (
    <Router>
      <div className="flex">
        {/* 左側のナビゲーション */}
        <nav className="w-1/4 h-screen bg-gray-200 p-4">
          <ul className="flex flex-col space-y-4">
            <li>
              <Link to="/test1" className="block text-center p-2 bg-blue-500 text-white rounded">テスト1</Link>
            </li>
            <li>
              <Link to="/test2" className="block text-center p-2 bg-blue-500 text-white rounded">テスト2</Link>
            </li>
          </ul>
        </nav>

        {/* 右側のコンテンツ */}
        <div className="w-3/4 p-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/test1" element={<Test1 />} />
            <Route path="/test2" element={<Test2 />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
