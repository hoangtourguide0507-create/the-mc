import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useGameStore } from './core/store';
import './index.css';
import { installGhibliShading } from './three/artStyle';

// Phải chạy trước khi bất kỳ shader nào được biên dịch
installGhibliShading();

// QA hook: ?qa=1 exposes the store so automated screenshots can jump between views.
if (new URLSearchParams(window.location.search).has('qa')) {
  (window as any).__mc = useGameStore;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
