const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace(/\/+$/, '');
export async function api(path, token, body) {
  const response = await fetch(BASE + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000)
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.issues?.[0]?.message || result.error || 'Request failed');
    error.status = response.status;
    throw error;
  }
  return result;
}
