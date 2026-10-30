import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (process.env.NODE_ENV === 'production' && !apiUrl) {
  throw new Error('Set NEXT_PUBLIC_API_URL before building the frontend (for example, https://api.example.com/api/v1).');
}
if (apiUrl) {
  const url = new URL(apiUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('NEXT_PUBLIC_API_URL must be a public HTTP(S) API address without credentials.');
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Remote API addresses must use HTTPS.');
}
export default { turbopack: { root }, outputFileTracingRoot: root };
