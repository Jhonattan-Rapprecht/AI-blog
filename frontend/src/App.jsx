import React, { useState, useEffect } from 'react';
import ArticleEditor from './ArticleEditor';

function App() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const root = document.documentElement;
    root.style.colorScheme = theme;
    root.style.backgroundColor = theme === 'light' ? '#fcfcfc' : '#1a1a1a';
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className={`app-container ${theme}`}>
      <ArticleEditor theme={theme} toggleTheme={toggleTheme} />
    </div>
  );
}

export default App;
