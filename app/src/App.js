import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Diary from './pages/Diary';
import Blog from './pages/Blog';
import Settings from './pages/Settings';
import Drive from './pages/Drive';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

// ブラウザのダークモード設定に応じてテーマを変更する
function useDarkMode() {
  useEffect(() => {
    const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);
}

function App() {
  useDarkMode();

  return (
    <Router>
      <div className="bg-white dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-200">
        <Switch>
          <Route exact path="/diary" component={Diary} />
          <Route exact path="/blog" component={Blog} />
          <Route exact path="/settings" component={Settings} />
          <Route exact path="/drive" component={Drive} />
          <Route exact path="/login" component={Login} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </Router>
  );
}

export default App;
