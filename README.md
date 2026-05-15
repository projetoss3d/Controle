# Controle — SaaS de Gestão Financeira Inteligente

Sistema fullstack para pequenas empresas com múltiplos sócios. Foco em **lucro real**,
**previsibilidade financeira**, **distribuição societária justa** e **decisão operacional**.

> Estado atual: **scaffolding inicial**. A arquitetura, schema do banco e fundação
> de backend/frontend estão em pé. Os módulos vão sendo preenchidos iterativamente.

---

## Stack

| Camada       | Tecnologia                                          |
| ------------ | --------------------------------------------------- |
| Frontend     | Next.js 14 (App Router) · React · TypeScript · Tailwind |
| Backend      | Node.js · Express · TypeScript · Prisma             |
| Banco        | PostgreSQL 16                                       |
| Auth         | JWT (provider desacoplado)                          |
| Storage      | S3-compatible (AWS / MinIO / R2) — driver pluggable |
| Infra        | Docker Compose · pronto para self-host              |

---

## Estrutura

```
Controle/
├── apps/
│   ├── backend/     # API REST modular (Node + Prisma)
│   └── frontend/    # Next.js mobile-first
├── docker-compose.yml
├── .env.example
└── package.json     # workspaces
```

---

## Como rodar (dev)

```bash
cp .env.example .env

# instala dependências de todos os workspaces
npm install

# sobe o postgres
docker compose up -d postgres

# backend
npm run dev:backend

# frontend (em outro terminal)
npm run dev:frontend
```

Backend em `http://localhost:4000`, frontend em `http://localhost:3000`.

---

## Como rodar tudo via Docker

```bash
cp .env.example .env
docker compose up --build
```

---

## Princípios de arquitetura

- **Multi-tenant** — toda entidade carrega `tenantId`; isolamento via middleware.
- **Sem hardcoding de URLs** — tudo por env.
- **Providers desacoplados** — storage, auth e IA são plugáveis.
- **Pronto para self-hosting** — sem dependência de cloud específica.
- **Mobile-first** — UI premium otimizada para celular.
- **Cálculos isolados** — lógica financeira em `shared/finance/` (testável).

---

## Módulos planejados

Receitas, parcelamento, despesas, despesas por cliente/projeto, custos inteligentes,
controle de tempo, sócios, regras societárias customizadas, vales/retiradas,
lucro líquido disponível, mini CRM de clientes, fechamento mensal, fluxo de caixa,
previsão financeira, alertas, dashboard, filtros avançados, anexos, RBAC, automações.

Veja `apps/backend/src/modules/` para o estado atual de cada um.
