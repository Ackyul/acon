import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Interceptor global de fetch para añadir token JWT y controlar la expiración de sesión
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const token = localStorage.getItem('acon_token');
  if (token) {
    init = init || {};
    const headers = new Headers(init.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    init.headers = headers;
  }
  
  const response = await originalFetch(input, init);
  
  if ((response.status === 401 || response.status === 403) && 
      window.location.pathname !== '/auth' && 
      window.location.pathname !== '/') {
    localStorage.removeItem('acon_token');
    localStorage.removeItem('acon_username');
    localStorage.removeItem('acon_fullname');
    window.location.href = '/auth';
  }
  
  return response;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
