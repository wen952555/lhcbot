
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("React Rendering Error:", error);
    rootElement.innerHTML = `<div style="padding: 20px; text-align: center; color: #64748b;">
      <p style="font-weight: bold;">应用加载失败</p>
      <p style="font-size: 12px; margin-top: 8px;">请刷新页面重试或检查网络连接。</p>
    </div>`;
  }
} else {
  console.error("Fatal: Could not find root element");
}
