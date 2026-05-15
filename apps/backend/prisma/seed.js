/* eslint-disable */
/**
 * Seed de demonstração do Controle.
 *
 * Idempotente: pode rodar múltiplas vezes que apenas garante a existência
 * do tenant "demo" + usuário admin + sócios + dados realistas dos últimos
 * 6 meses (receitas, parcelas, despesas, retiradas).
 *
 * Credenciais geradas:
 *   tenantSlug: demo
 *   email:      admin@demo.com
 *   senha:      demo1234
 *
 * Regra societária: 25% sócio A · 25% sócio B · 50% retido na empresa.
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const SLUG = "demo";

async function main() {
  console.log("[seed] iniciando…");

  // --- tenant ---
  const tenant = await prisma.tenant.upsert({
    where: { slug: SLUG },
    update: {},
    create: { slug: SLUG, name: "Empresa Demo" },
  });

  // --- usuário admin ---
  const passwordHash = await bcrypt.hash("demo1234", 10);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@demo.com" } },
    update: { passwordHash, role: "ADMIN", name: "Admin Demo" },
    create: {
      tenantId: tenant.id,
      email: "admin@demo.com",
      name: "Admin Demo",
      passwordHash,
      role: "ADMIN",
    },
  });

  // --- sócios (regra 25/25/50) ---
  const partnerA = await upsertPartner(tenant.id, "Sócio A", 25, 80);
  const partnerB = await upsertPartner(tenant.id, "Sócio B", 25, 80);

  // --- categorias e tipos de serviço ---
  const catMaterial = await upsertExpenseCategory(tenant.id, "material", "Material");
  const catTool = await upsertExpenseCategory(tenant.id, "tool", "Ferramenta");
  const catMarketing = await upsertExpenseCategory(tenant.id, "marketing", "Marketing");
  const catTransport = await upsertExpenseCategory(tenant.id, "transport", "Transporte");
  const catEnergy = await upsertExpenseCategory(tenant.id, "energy", "Energia");
  const catSoftware = await upsertExpenseCategory(tenant.id, "software", "Software");
  const catLabor = await upsertExpenseCategory(tenant.id, "labor", "Mão de obra");
  const catSubs = await upsertExpenseCategory(tenant.id, "subscription", "Assinatura");

  const stPrint = await upsertServiceType(tenant.id, "print3d", "Impressão 3D");
  const stDesign = await upsertServiceType(tenant.id, "design3d", "Projeto 3D");
  const stFurniture = await upsertServiceType(tenant.id, "planned_furniture", "Móveis planejados");
  const stSocial = await upsertServiceType(tenant.id, "social_media", "Social media");

  // --- clientes ---
  const customers = [];
  for (const c of [
    { name: "Studio Aurora", email: "contato@aurora.com" },
    { name: "Casa Bella Móveis", email: "vendas@casabella.com" },
    { name: "MakerLab", email: "ola@makerlab.io" },
    { name: "Pizzaria Forno Vivo", email: "fornovivo@gmail.com" },
  ]) {
    const cust = await prisma.customer.upsert({
      where: { id: `seed-${tenant.id}-${slugify(c.name)}` },
      update: {},
      create: {
        id: `seed-${tenant.id}-${slugify(c.name)}`,
        tenantId: tenant.id,
        name: c.name,
        email: c.email,
      },
    });
    customers.push(cust);
  }

  // --- projetos (1 por cliente) ---
  const projects = [];
  for (const cust of customers) {
    const proj = await prisma.project.upsert({
      where: { id: `seed-proj-${cust.id}` },
      update: {},
      create: {
        id: `seed-proj-${cust.id}`,
        tenantId: tenant.id,
        customerId: cust.id,
        name: `Projeto ${cust.name}`,
        status: "ACTIVE",
        startedAt: monthsAgo(4),
      },
    });
    projects.push(proj);
  }

  // --- limpa dados transacionais do seed anterior (idempotência) ---
  await prisma.installment.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.expense.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.revenue.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.withdrawal.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.timeEntry.deleteMany({ where: { tenantId: tenant.id } });

  // --- 6 meses de movimento ---
  const services = [stPrint, stDesign, stFurniture, stSocial];
  const expenseCats = [catMaterial, catTool, catMarketing, catTransport, catEnergy, catSoftware, catLabor, catSubs];

  for (let m = 5; m >= 0; m--) {
    const monthDate = monthsAgo(m);
    const ym = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

    // 4 receitas/mês — uma por cliente
    for (let i = 0; i < customers.length; i++) {
      const cust = customers[i];
      const proj = projects[i];
      const svc = services[i % services.length];
      const partner = i % 2 === 0 ? partnerA : partnerB;

      const baseAmount = 2500 + (i * 750) + Math.random() * 1500;
      const amount = Math.round(baseAmount * 100) / 100;
      const directCost = Math.round(amount * (0.18 + Math.random() * 0.12) * 100) / 100;

      const issuedAt = new Date(monthDate.getFullYear(), monthDate.getMonth(), 5 + i);
      const installmentsCount = (i % 3) + 1; // 1, 2 ou 3 parcelas
      const perInstallment = Math.round((amount / installmentsCount) * 100) / 100;
      const installments = Array.from({ length: installmentsCount }).map((_, k) => {
        const due = new Date(issuedAt);
        due.setMonth(due.getMonth() + k);
        // parcelas vencidas há mais de 1 mês são "PAID", último pode ser "PENDING"
        const isPast = due < new Date();
        const isLastFuture = !isPast && k === installmentsCount - 1;
        return {
          tenantId: tenant.id,
          number: k + 1,
          amount: perInstallment,
          dueDate: due,
          status: isPast ? "PAID" : isLastFuture ? "PENDING" : "PENDING",
          paidAt: isPast ? due : null,
        };
      });

      const allPaid = installments.every((x) => x.status === "PAID");
      const anyPaid = installments.some((x) => x.status === "PAID");

      await prisma.revenue.create({
        data: {
          tenantId: tenant.id,
          customerId: cust.id,
          projectId: proj.id,
          serviceTypeId: svc.id,
          partnerInChargeId: partner.id,
          description: `${svc.label} — ${cust.name} (${ym})`,
          amount,
          directCost,
          issuedAt,
          status: allPaid ? "PAID" : anyPaid ? "PARTIAL" : "CONTRACTED",
          installments: { create: installments },
        },
      });
    }

    // despesas operacionais do mês
    const monthlyExpenses = [
      { cat: catEnergy, amount: 280 + Math.random() * 80, nature: "INDIRECT", kind: "FIXED", desc: "Conta de energia" },
      { cat: catSubs, amount: 199, nature: "OPERATIONAL", kind: "FIXED", desc: "Assinatura softwares" },
      { cat: catSoftware, amount: 89, nature: "OPERATIONAL", kind: "FIXED", desc: "Licenças design" },
      { cat: catMarketing, amount: 350 + Math.random() * 250, nature: "INDIRECT", kind: "VARIABLE", desc: "Campanhas mídia" },
      { cat: catTransport, amount: 120 + Math.random() * 200, nature: "DIRECT", kind: "VARIABLE", desc: "Entregas e deslocamento" },
      { cat: catMaterial, amount: 450 + Math.random() * 600, nature: "DIRECT", kind: "VARIABLE", desc: "Filamentos e insumos" },
      { cat: catLabor, amount: 600 + Math.random() * 400, nature: "DIRECT", kind: "VARIABLE", desc: "Mão de obra externa" },
      { cat: catTool, amount: m === 5 ? 1200 : 0, nature: "INDIRECT", kind: "VARIABLE", desc: "Ferramentas" },
    ].filter((e) => e.amount > 0);

    for (let j = 0; j < monthlyExpenses.length; j++) {
      const e = monthlyExpenses[j];
      const occurredAt = new Date(monthDate.getFullYear(), monthDate.getMonth(), 8 + j);
      await prisma.expense.create({
        data: {
          tenantId: tenant.id,
          categoryId: e.cat.id,
          description: e.desc,
          amount: round(e.amount),
          occurredAt,
          kind: e.kind,
          nature: e.nature,
          recurring: e.kind === "FIXED",
          recurrenceDay: e.kind === "FIXED" ? 5 : null,
          projectId: e.nature === "DIRECT" ? projects[j % projects.length].id : null,
          customerId: e.nature === "DIRECT" ? customers[j % customers.length].id : null,
        },
      });
    }

    // retiradas dos sócios
    if (m <= 4) {
      await prisma.withdrawal.create({
        data: {
          tenantId: tenant.id,
          partnerId: partnerA.id,
          type: "ADVANCE",
          amount: 1500,
          occurredAt: new Date(monthDate.getFullYear(), monthDate.getMonth(), 20),
          description: "Vale mensal",
        },
      });
      await prisma.withdrawal.create({
        data: {
          tenantId: tenant.id,
          partnerId: partnerB.id,
          type: "ADVANCE",
          amount: 1200,
          occurredAt: new Date(monthDate.getFullYear(), monthDate.getMonth(), 22),
          description: "Vale mensal",
        },
      });
    }

    // horas trabalhadas
    for (const proj of projects) {
      await prisma.timeEntry.create({
        data: {
          tenantId: tenant.id,
          partnerId: partnerA.id,
          projectId: proj.id,
          hours: round(3 + Math.random() * 6),
          hourlyRate: 80,
          workedAt: new Date(monthDate.getFullYear(), monthDate.getMonth(), 15),
        },
      });
      await prisma.timeEntry.create({
        data: {
          tenantId: tenant.id,
          partnerId: partnerB.id,
          projectId: proj.id,
          hours: round(2 + Math.random() * 4),
          hourlyRate: 80,
          workedAt: new Date(monthDate.getFullYear(), monthDate.getMonth(), 16),
        },
      });
    }
  }

  console.log("[seed] concluído.");
  console.log("[seed] login:    tenantSlug=demo  email=admin@demo.com  senha=demo1234");
}

// helpers ----------------------------------------------------------

async function upsertPartner(tenantId, name, share, hourlyRate) {
  return prisma.partner.upsert({
    where: { id: `seed-${tenantId}-${slugify(name)}` },
    update: { profitShare: share, hourlyRate, active: true },
    create: {
      id: `seed-${tenantId}-${slugify(name)}`,
      tenantId,
      name,
      profitShare: share,
      hourlyRate,
      type: "WORKING",
    },
  });
}

async function upsertExpenseCategory(tenantId, key, label) {
  return prisma.expenseCategory.upsert({
    where: { tenantId_key: { tenantId, key } },
    update: { label },
    create: { tenantId, key, label },
  });
}

async function upsertServiceType(tenantId, key, label) {
  return prisma.serviceType.upsert({
    where: { tenantId_key: { tenantId, key } },
    update: { label },
    create: { tenantId, key, label },
  });
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function monthsAgo(n) {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - n);
  return d;
}

function round(v) {
  return Math.round(v * 100) / 100;
}

main()
  .catch((e) => {
    console.error("[seed] erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
