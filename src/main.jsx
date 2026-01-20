import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// --- WYMUSZENIE STYLÓW (Fix wyglądu) ---
// Ten kod sprawdza, czy style są załadowane. Jeśli nie, pobiera je ręcznie.
const loadTailwind = () => {
  if (!document.querySelector('script[src*="tailwindcss"]')) {
    const script = document.createElement('script');
    script.src = 'https://cdn.tailwindcss.com';
    document.head.appendChild(script);
  }
  // Dodatkowo ustawiamy ładną czcionkę systemową
  const fontStyle = document.createElement('style');
  fontStyle.innerHTML = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; }
  `;
  document.head.appendChild(fontStyle);
};

loadTailwind();
// ---------------------------------------

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
