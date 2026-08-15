import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { migrate } from './migrate';
import { router } from './routes';

const app = express();
// Atrás do proxy do EasyPanel, para que req.ip traga o IP real (limite de tentativas de login)
app.set('trust proxy', 1);
// Em produção defina CORS_ORIGIN com o domínio do front (ex.: https://seu-projeto.vercel.app)
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json({ limit: '5mb' }));
app.use('/api', router);

// Erros não tratados das rotas caem aqui (Express 5 encaminha promessas rejeitadas)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[api] erro:', err);
  res.status(500).json({ error: 'Erro interno na API. Veja o terminal para detalhes.' });
});

const port = Number(process.env.PORT ?? 3001);

/** O PostgreSQL pode subir depois da API (containers reiniciando juntos), então tentamos algumas vezes. */
async function migrateWithRetry(attempts = 10, delayMs = 3000): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await migrate();
      return;
    } catch (err) {
      if (attempt >= attempts) throw err;
      console.warn(`[api] banco indisponível (tentativa ${attempt}/${attempts}):`, (err as Error).message);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

migrateWithRetry()
  .then(() => {
    app.listen(port, () => console.log(`[api] pronto na porta ${port}`));
  })
  .catch((err) => {
    console.error('[api] falha ao iniciar (PostgreSQL acessível?):', (err as Error).message);
    process.exit(1);
  });
