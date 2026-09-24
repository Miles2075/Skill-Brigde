const API_URL = "/api";
export async function api<T>(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("skillbridge_token");
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  if (!res.ok)
    throw new Error(data.message || `Request failed (${res.status})`);
  return data as T;
}
export const setToken = (t: string) =>
  localStorage.setItem("skillbridge_token", t);
export const clearToken = () => localStorage.removeItem("skillbridge_token");
