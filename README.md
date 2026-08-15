# Dashboard Financeiro

Dashboard financeiro pessoal com visual moderno em preto e branco, feito com React + TypeScript + Tailwind CSS + Recharts, com armazenamento em **PostgreSQL** local via API Node/Express.

## Funcionalidades

- **Aba Dashboard**: saldo em conta, receitas/despesas do mês, resultado, patrimônio total, evolução do saldo (gráfico de área), receitas × despesas por mês (barras), despesas por categoria (rosca), resumo Pix, investimentos com rendimento estimado, meta de economia mensal e lançamentos recentes.
- **Aba Lançamentos**: formulários com máscaras (moeda BRL, percentual, data) e validação por REGEX, planilha de transações com busca, filtros, ordenação, paginação, edição e exclusão, além da tabela de investimentos com valor atual calculado.
- **Personalização**: tema escuro/claro, cor de destaque, fonte, tamanho do texto, animações lig/desl, modo privado (oculta valores). As preferências também ficam salvas no banco.
- **Dados**: salvos no PostgreSQL local (banco `dashboard_financeiro`, criado automaticamente), com exportação/importação de backup em JSON. Dados de exemplo semeados na primeira execução.

## Pré-requisitos

- Node.js 20+
- PostgreSQL rodando localmente (instalador oficial, serviço do Windows)

## Configuração

Crie um arquivo `.env` na raiz (não versionado):

```env
DATABASE_URL=postgres://postgres:SUA_SENHA@localhost:5432/dashboard_financeiro
PORT=3001
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
  routes.ts      → rotas REST (/api/...)
```

## Cálculos (congruência)

Todos os valores são armazenados em **centavos (inteiros)** para evitar erros de ponto flutuante.

- Saldo em conta = saldo inicial + Σ receitas − Σ despesas
- Patrimônio total = saldo em conta + valor atual dos investimentos
- Valor atual do investimento = aporte × (1 + taxa a.a.)^(dias/365) — juros compostos pró-rata
- Pix recebido/enviado = transações com método "Pix" no período
- Taxa de economia = (receitas − despesas) / receitas do mês

> Importante: aportes em investimentos são registrados na seção **Investimentos** (não como despesa), evitando dupla contagem.

## Deploy

- **Front-end (Vercel)**: build estático do Vite (`npm run build`, saída em `dist/`). Configure a variável de ambiente `VITE_API_URL` no Vercel apontando para a API na VPS (ex.: `https://api.seudominio.com`). Sem ela, o front tenta `/api` no mesmo domínio.
- **API + PostgreSQL (VPS)**: rode `server/` com Node 20+ (ex.: `npx tsx server/index.ts` sob um gerenciador de processos como pm2/systemd). Defina no `.env` da VPS: `DATABASE_URL`, `PORT` e `CORS_ORIGIN` (domínio do front no Vercel).

## Roadmap

1. ✅ Front-end
2. ✅ Persistência em PostgreSQL (API)
3. ⏳ Migração para VPS (front no Vercel, API + banco na VPS)
4. ⏳ Agente de IA
