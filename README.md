# Controle — SaaS de Gestão Financeira Inteligente

Sistema fullstack para pequenas empresas com múltiplos sócios. Foco em **lucro real**,
**previsibilidade financeira**, **distribuição societária justa** e **decisão operacional**.

---

## ⚡ Subir o sistema completo (1 comando)

```bash
cp .env.example .env
docker compose up --build
```

Tudo sobe junto: Postgres, backend e frontend. O backend aplica o schema (`prisma db push`) e
roda o seed automaticamente na primeira execução.

Depois acesse:

- **Frontend:** http://localhost:3000
- **Backend (health):** http://localhost:4000/api/health

### Login da conta de demonstração

| Campo            | Valor             |
| ---------------- | ----------------- |
| Empresa (slug)   | `demo`            |
| E-mail           | `admin@demo.com`  |
| Senha            | `demo1234`        |

A conta demo já vem com:

- 2 sócios na regra **25% / 25% / 50% retido**
- 4 clientes, 4 projetos
- 6 meses de receitas (com parcelas), despesas (fixas e variáveis), retiradas e horas trabalhadas

---

## 🧱 Stack

| Camada    | Tecnologia                                              |
| --------- | ------------------------------------------------------- |
| Frontend  | Next.js 14 (App Router) · React · TypeScript · Tailwind |
| Backend   | Node.js · Express · TypeScript · Prisma                 |
| Banco     | PostgreSQL 16                                           |
| Auth      | JWT (provider desacoplado)                              |
| Storage   | S3-compatible (driver pluggable, fallback local)        |
| Infra     | Docker Compose · pronto para self-host                  |

---

## 🗂 Estrutura

```
Controle/
├── apps/
│   ├── backend/     # API REST modular (Node + Prisma)
│   └── frontend/    # Next.js mobile-first
├── docker-compose.yml
├── .env.example
└── package.json     # workspaces
```

### Telas principais (frontend)

- `/login` — autenticação
- `/dashboard` — resumo do mês, lucro real, gráfico de 6 meses, distribuição entre sócios
- `/receitas` — receitas + parcelas (marcar como pago)
- `/despesas` — diretas, indiretas e operacionais com filtros
- `/clientes` — mini CRM + dashboard individual de lucro real por cliente
- `/socios` — sócios + retiradas (vale, pró-labore, distribuição)

### Endpoints principais (backend)

```
POST  /api/auth/signup
POST  /api/auth/login
GET   /api/dashboard/overview      # fotografia financeira do período
GET   /api/dashboard/monthly       # série mensal para gráfico
GET   /api/customers
GET   /api/customers/:id/dashboard # lucro real por cliente
GET   /api/projects
GET   /api/projects/:id/pnl        # P&L do projeto (com custo de tempo)
GET   /api/revenues                # filtros: customerId, projectId, status, from, to
POST  /api/revenues                # com parcelas inline
POST  /api/revenues/installments/:id/pay
GET   /api/expenses
POST  /api/expenses
GET   /api/partners
POST  /api/partners
POST  /api/partners/withdrawals
GET   /api/partners/:id/withdrawals
GET   /api/time-entries
POST  /api/time-entries
GET   /api/lookups/expense-categories
GET   /api/lookups/service-types
```

---

## 🧪 Rodar em modo dev (sem Docker)

```bash
cp .env.example .env
docker compose up -d postgres

# instala deps de todos os workspaces
npm install

# backend
npm install --prefix apps/backend
npx --prefix apps/backend prisma generate
npx --prefix apps/backend prisma db push
node apps/backend/prisma/seed.js
npm run dev:backend

# em outro terminal
npm install --prefix apps/frontend
npm run dev:frontend
```

---

## 🧠 Princípios de arquitetura

- **Multi-tenant** — toda entidade carrega `tenantId`; isolamento via middleware.
- **Sem hardcoding de URLs** — tudo por env (frontend usa `NEXT_PUBLIC_API_URL`).
- **Providers desacoplados** — storage, auth e IA são plugáveis por env.
- **Pronto para self-hosting** — sem dependência de cloud específica, Docker first-class.
- **Mobile-first** — UI premium, bottom nav, touch targets confortáveis.
- **Cálculos isolados** — lógica financeira em `apps/backend/src/shared/finance/`
  (testável e reusável).

### Regra societária

A distribuição respeita cotas individuais (ex.: 25% / 25% / 50% retido). A retirada de
um sócio **só afeta o saldo individual dele**, nunca os demais. Toda essa lógica está em
`shared/finance/calculator.ts` (`distributeProfit`, `partnerBalance`).

---

## 🛣 Próximos módulos do roadmap

Schema já cobre: anexos S3, alertas inteligentes, fechamento mensal automático, filtros
salvos como widgets, despesas recorrentes em job, RBAC granular. As próximas PRs vão
preencher cada um.
