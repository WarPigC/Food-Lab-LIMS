// Central API configuration.
// In production, defaults to empty string so requests use relative URLs (/api/...)
// and Socket.IO connects to the same origin.
// In local development, falls back to http://localhost:5000.
const API_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.PROD ? '' : 'http://localhost:5000');

export default API_URL;
