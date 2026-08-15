import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, api } from '../lib/api';
import { getToken, setToken, subscribeToken } from '../lib/authToken';

type AuthStatus = 'checking' | 'locked' | 'unlocked';

interface AuthContextValue {
  status: AuthStatus;
  login: (password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() => (getToken() ? 'checking' : 'locked'));

  // Qualquer requisição que receba 401 limpa o token: aqui reagimos voltando para a tela de acesso.
  useEffect(() => {
    return subscribeToken((token) => setStatus(token ? 'unlocked' : 'locked'));
  }, []);

  // Confere no servidor se o token guardado no navegador ainda vale.
  useEffect(() => {
    if (status !== 'checking') return;
    let cancelled = false;
    api
      .session()
      .then(() => {
        if (!cancelled) setStatus('unlocked');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Sem status HTTP a API está fora do ar: mantém a sessão e deixa a tela de dados avisar.
        if (err instanceof ApiError && err.status === undefined) setStatus('unlocked');
        else setStatus('locked');
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const login = useCallback(async (password: string) => {
    const { token } = await api.login(password);
    setToken(token);
    setStatus('unlocked');
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setStatus('locked');
  }, []);

  const value = useMemo(() => ({ status, login, logout }), [status, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
