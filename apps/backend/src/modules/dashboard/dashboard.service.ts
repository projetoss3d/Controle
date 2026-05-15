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

    // saldo individual do sócio = distribuído - retiradas (no período).
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
};
