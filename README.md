# Dashboard Financeiro

Dashboard financeiro pessoal com visual moderno em preto e branco, feito com React + TypeScript + Tailwind CSS + Recharts, com armazenamento em **PostgreSQL** via API Node/Express e acesso protegido por senha.

## Funcionalidades

- **Aba Dashboard**: saldo em conta, receitas/despesas do mês, resultado, patrimônio total, evolução do saldo (gráfico de área), receitas × despesas por mês (barras), despesas por categoria (rosca), resumo Pix, investimentos com rendimento estimado, meta de economia mensal e lançamentos recentes.
- **Aba Lançamentos**: formulários com máscaras (moeda BRL, percentual, data) e validação por REGEX, planilha de transações com busca, filtros, ordenação, paginação, edição e exclusão, além da tabela de investimentos com valor atual calculado.
- **Personalização**: tema escuro/claro, cor de destaque, fonte, tamanho do texto, animações lig/desl, modo privado (oculta valores). As preferências também ficam salvas no banco.
- **Dados**: salvos no PostgreSQL (banco criado automaticamente), com exportação/importação de backup em JSON. Dados de exemplo semeados na primeira execução.
- **Acesso privado**: tela de login com senha única. A API só responde com um token válido (`Authorization: Bearer`), então nada é exibido nem trafegado sem autenticação.

## Pré-requisitos

- Node.js 20+
- PostgreSQL acessível (local ou na VPS)

## Configuração

Crie um arquivo `.env` na raiz a partir do `.env.example` (não versionado):

```env
DATABASE_URL=postgres://postgres:SUA_SENHA@localhost:5432/dashboard_financeiro
PORT=3001
APP_PASSWORD=sua-senha-de-acesso
AUTH_SECRET=chave-aleatoria-longa
```

`APP_PASSWORD` é obrigatória: sem ela a API não sobe (evita expor os dados por descuido). Gere o `AUTH_SECRET` com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Como rodar

```bash
npm install
npm run dev      # sobe a API (porta 3001) e o front (porta 5173) juntos
npm run build    # build de produção (com checagem de tipos)
npm test         # testes unitários dos cálculos (Vitest)
```

O banco de dados e as tabelas são criados automaticamente na primeira execução (migrações em `server/migrations/`). Se houver dados reais salvos no navegador da fase anterior, eles são migrados para o banco automaticamente.

## Arquitetura

```
src/       → front-end React (Vite, porta 5173, proxy /api → 3001)
server/    → API Express + migrações SQL (porta 3001)
  db.ts          → pool de conexões (pg)
  migrate.ts     → criação do banco + migrações versionadas
  auth.ts        → login por senha, token assinado (HMAC) e middleware
  routes.ts      → rotas REST (/api/...)
Dockerfile → imagem só da API, usada no EasyPanel
```

Rotas públicas: `POST /api/login` e `GET /api/health`. Todas as outras exigem o token.

## Cálculos (congruência)

Todos os valores são armazenados em **centavos (inteiros)** para evitar erros de ponto flutuante.

- Saldo em conta = saldo inicial + Σ receitas − Σ despesas
- Patrimônio total = saldo em conta + valor atual dos investimentos
- Valor atual do investimento = aporte × (1 + taxa a.a.)^(dias/365) — juros compostos pró-rata
- Pix recebido/enviado = transações com método "Pix" no período
- Taxa de economia = (receitas − despesas) / receitas do mês

> Importante: aportes em investimentos são registrados na seção **Investimentos** (não como despesa), evitando dupla contagem.

## Deploy

**Front-end (Vercel)**: build estático do Vite (`npm run build`, saída em `dist/`). Defina a variável `VITE_API_URL` com o domínio público da API (ex.: `https://api-financeiro.seudominio.com`). Sem ela, o front tenta `/api` no mesmo domínio.

**API (EasyPanel na VPS)**: crie um App com origem no repositório do GitHub e build por **Dockerfile**. Variáveis de ambiente do serviço:

| Variável | Exemplo | Observação |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://postgres:SENHA@database_postgresql:5432/databasegfa` | host interno do serviço PostgreSQL do EasyPanel |
| `PORT` | `3001` | mesma porta configurada no proxy do App |
| `APP_PASSWORD` | `sua-senha` | senha de acesso ao dashboard |
| `AUTH_SECRET` | `chave-aleatoria-longa` | sem ela, os logins caem a cada reinício |
| `CORS_ORIGIN` | `https://seu-projeto.vercel.app` | domínios do front autorizados (separados por vírgula) |

O App precisa de um domínio com HTTPS apontando para a porta `3001`. Use `GET /api/health` como healthcheck (não expõe dados). As tabelas são criadas na primeira execução; se o PostgreSQL ainda estiver subindo, a API tenta reconectar por até 30 segundos.

## Roadmap

1. ✅ Front-end
2. ✅ Persistência em PostgreSQL (API)
3. ✅ Acesso privado por senha (login + token na API)
4. ⏳ Migração para VPS (front no Vercel, API + banco no EasyPanel)
5. ⏳ Agente de IA
