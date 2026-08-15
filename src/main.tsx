import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/700.css';
import App from './App.js';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('عنصر ریشه پیدا نشد');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
