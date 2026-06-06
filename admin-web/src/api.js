const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export function getSession() {
  const raw = localStorage.getItem("session");
  return raw ? JSON.parse(raw) : null;
}

export function setSession(session) {
  localStorage.setItem("session", JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem("session");
}

export async function api(path, options = {}) {
  const session = getSession();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function login(email, password) {
  const session = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  setSession(session);
  return session;
}
