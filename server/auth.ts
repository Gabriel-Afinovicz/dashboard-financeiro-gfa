import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

const password = process.env.APP_PASSWORD;
if (!password) {
  throw new Error(
    'APP_PASSWORD não definida. Defina a senha de acesso ao dashboard no .env (local) ou nas variáveis de ambiente do servidor.',
  );
}

/** Sem AUTH_SECRET os tokens continuam válidos, mas expiram a cada reinício do servidor. */
const secret = process.env.AUTH_SECRET ?? crypto.randomBytes(32).toString('hex');
if (!process.env.AUTH_SECRET) {
  console.warn('[api] AUTH_SECRET não definida: os logins serão perdidos a cada reinício da API.');
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Compara dois textos em tempo constante (evita ataques por medição de tempo). */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function createToken(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function isValidToken(token: string): boolean {
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { exp?: number };
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

const attempts = new Map<string, { count: number; firstAt: number }>();

function tooManyAttempts(ip: string): boolean {
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > ATTEMPT_WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function registerFailure(ip: string): void {
  const entry = attempts.get(ip);
  if (!entry || Date.now() - entry.firstAt > ATTEMPT_WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAt: Date.now() });
    return;
  }
  entry.count++;
}

/** POST /api/login — troca a senha por um token de acesso. */
export function login(req: Request, res: Response): void {
  const ip = req.ip ?? 'desconhecido';
  if (tooManyAttempts(ip)) {
    res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
    return;
  }

  const sent = (req.body as { password?: unknown } | null)?.password;
  if (typeof sent !== 'string' || !safeEqual(sent, password!)) {
    registerFailure(ip);
    res.status(401).json({ error: 'Senha incorreta.' });
    return;
  }

  attempts.delete(ip);
  res.json({ token: createToken() });
}

/** Bloqueia a requisição quando o cabeçalho Authorization não traz um token válido. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !isValidToken(token)) {
    res.status(401).json({ error: 'Sessão expirada ou inválida. Entre novamente.' });
    return;
  }
  next();
}
