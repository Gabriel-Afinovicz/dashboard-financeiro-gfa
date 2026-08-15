const STORAGE_KEY = 'dashboard-financeiro:token';

let token: string | null = readStored();
const listeners = new Set<(token: string | null) => void>();

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return token;
}

export function setToken(next: string | null): void {
  if (token === next) return;
  token = next;
  try {
    if (next) localStorage.setItem(STORAGE_KEY, next);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // navegação privada sem localStorage: o token vive só nesta aba
  }
  listeners.forEach((listener) => listener(next));
}

/** Avisa a aplicação quando o token muda (login, logout ou sessão expirada). */
export function subscribeToken(listener: (token: string | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
