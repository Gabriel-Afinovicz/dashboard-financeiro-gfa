import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { btnPrimary, inputClass } from '../ui/controls';

export function LoginScreen() {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError(null);
    try {
      await login(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="anim-fade-up w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-card text-accent">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Dashboard <span className="font-medium text-muted">Financeiro</span>
            </h1>
            <p className="mt-1 text-sm text-muted">Área privada. Informe a senha para continuar.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-card p-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Senha de acesso</span>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                autoFocus
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={Boolean(error)}
                className={`${inputClass} pr-11 ${error ? 'border-neg' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                title={show ? 'Ocultar senha' : 'Mostrar senha'}
                aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute inset-y-0 right-2 my-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-card2 hover:text-fg"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <span className="text-xs text-neg">{error}</span>}
          </label>

          <button type="submit" disabled={busy || !password} className={`${btnPrimary} mt-4 w-full`}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-faint">
          Seus dados ficam no seu banco de dados privado e só são exibidos após o login.
        </p>
      </div>
    </div>
  );
}
