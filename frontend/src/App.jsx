import React, { useState, useEffect } from 'react';
import ArticleEditor from './ArticleEditor';

function App() {
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className={`app-container ${theme}`}>
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000
      }}>
        <button
          onClick={toggleTheme}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            cursor: 'pointer',
            border: '1px solid #ddd',
            backgroundColor: theme === 'light' ? '#fff' : '#333',
            color: theme === 'light' ? '#333' : '#fff',
            fontWeight: '500',
            transition: 'all 0.3s ease'
          }}
        >
          {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
      </div>
      <ArticleEditor theme={theme} />
    </div>
  );
}

export default App;
