import { prisma } from "../../config/prisma";
import {
  computeProfit,
  distributeProfit,
  partnerBalance,
} from "../../shared/finance/calculator";

interface PeriodInput {
  tenantId: string;
  from: Date;
  to: Date;
}

/**
 * Calcula a "fotografia" financeira de um período.
 *
 * Responde:
 *  - Estou lucrando ou apenas girando dinheiro?
 *  - Quanto realmente sobrou esse mês?
 *  - Quanto cada sócio pode sacar?
 *  - Quanto fica retido na empresa?
 */
export const dashboardService = {
  async overview({ tenantId, from, to }: PeriodInput) {
    const [revenues, expenses, partners, withdrawals] = await Promise.all([
      prisma.revenue.findMany({
        where: { tenantId, issuedAt: { gte: from, lte: to } },
        select: { amount: true, directCost: true },
      }),
      prisma.expense.findMany({
        where: { tenantId, occurredAt: { gte: from, lte: to } },
        select: { amount: true, nature: true },
      }),
      prisma.partner.findMany({
        where: { tenantId, active: true },
        select: { id: true, name: true, profitShare: true },
      }),
      prisma.withdrawal.findMany({
        where: { tenantId, occurredAt: { gte: from, lte: to } },
        select: { partnerId: true, amount: true },
      }),
    ]);

    const revenue = revenues.reduce((s, r) => s + Number(r.amount), 0);
    const directFromRevenues = revenues.reduce((s, r) => s + Number(r.directCost), 0);

    let directFromExpenses = 0;
    let indirect = 0;
    let operational = 0;
    for (const e of expenses) {
      const v = Number(e.amount);
      if (e.nature === "DIRECT") directFromExpenses += v;
      else if (e.nature === "INDIRECT") indirect += v;
      else operational += v;
    }

    const profit = computeProfit({
      revenue,
      directCosts: directFromRevenues + directFromExpenses,
      indirectCosts: indirect,
      operationalCosts: operational,
    });

    const distribution = distributeProfit(
      profit.netProfit,
      partners.map((p) => ({ partnerId: p.id, share: Number(p.profitShare) })),
    );

    const withdrawnByPartner = new Map<string, number>();
    for (const w of withdrawals) {
      withdrawnByPartner.set(
        w.partnerId,
        (withdrawnByPartner.get(w.partnerId) ?? 0) + Number(w.amount),
      );
    }

    const partnerBreakdown = distribution.perPartner.map((p) => {
      const partnerInfo = partners.find((x) => x.id === p.partnerId);
      const withdrawn = withdrawnByPartner.get(p.partnerId) ?? 0;
      return {
        partnerId: p.partnerId,
        partnerName: partnerInfo?.name ?? "—",
        share: p.share,
        distributed: p.amount,
        withdrawn,
        balance: partnerBalance(p.amount, withdrawn),
      };
    });

    return {
      period: { from, to },
      revenue,
      costs: {
        direct: directFromRevenues + directFromExpenses,
        indirect,
        operational,
      },
      profit,
      distribution: {
        distributable: distribution.distributable,
        retained: distribution.retained,
        partners: partnerBreakdown,
      },
    };
  },

  /**
   * Série dos últimos N meses para gráfico:
   * faturamento, custo total e lucro líquido por mês.
   */
  async monthlySeries({ tenantId, months = 6 }: { tenantId: string; months?: number }) {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const [revenues, expenses] = await Promise.all([
      prisma.revenue.findMany({
        where: { tenantId, issuedAt: { gte: start, lte: end } },
        select: { amount: true, directCost: true, issuedAt: true },
      }),
      prisma.expense.findMany({
        where: { tenantId, occurredAt: { gte: start, lte: end } },
        select: { amount: true, nature: true, occurredAt: true },
      }),
    ]);

    const buckets: Record<string, { revenue: number; direct: number; indirect: number; operational: number }> = {};
    for (let i = 0; i < months; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const key = monthKey(d);
      buckets[key] = { revenue: 0, direct: 0, indirect: 0, operational: 0 };
    }

    for (const r of revenues) {
      const key = monthKey(r.issuedAt);
      if (buckets[key]) {
        buckets[key].revenue += Number(r.amount);
        buckets[key].direct += Number(r.directCost);
      }
    }
    for (const e of expenses) {
      const key = monthKey(e.occurredAt);
      if (!buckets[key]) continue;
      const v = Number(e.amount);
      if (e.nature === "DIRECT") buckets[key].direct += v;
      else if (e.nature === "INDIRECT") buckets[key].indirect += v;
      else buckets[key].operational += v;
    }

    return Object.entries(buckets).map(([month, b]) => {
      const profit = computeProfit({
        revenue: b.revenue,
        directCosts: b.direct,
        indirectCosts: b.indirect,
        operationalCosts: b.operational,
      });
      return {
        month,
        revenue: b.revenue,
        totalCost: Math.round((b.direct + b.indirect + b.operational) * 100) / 100,
        netProfit: profit.netProfit,
      };
    });
  },
};

function monthKey(d: Date | string): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
}
