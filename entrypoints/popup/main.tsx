import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './style.css';

const isStandalone =
  new URLSearchParams(window.location.search).get('standalone') === '1';
if (isStandalone) {
  document.documentElement.dataset.standalone = 'true';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App isStandalone={isStandalone} />
  </React.StrictMode>,
);
