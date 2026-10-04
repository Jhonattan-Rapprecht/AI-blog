import React, { useState, useEffect } from 'react';
import ArticleEditor from './ArticleEditor';

function App() {
  const [theme, setTheme] = useState('dark'); // Set Dark Mode as default

  useEffect(() => {
    const root = document.documentElement;
    root.style.colorScheme = theme;
    // Remove forced background color here to let the Editor handle it
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className={`app-container ${theme}`} style={{ minHeight: '100vh' }}>
      {/* The toggle button is now inside ArticleEditor's sidebar,
          so we remove the fixed button from here to avoid duplicates */}
      <ArticleEditor theme={theme} toggleTheme={toggleTheme} />
    </div>
  );
}

export default App;
