/**
 * Cálculos financeiros centrais.
 * Mantidos isolados aqui para serem testáveis e reusáveis em todo o app.
 *
 * Toda operação monetária usa números em BRL com 2 casas. Arredondamento
 * sempre half-even via toFixed para evitar drift em somas longas.
 */

export type Money = number;

export const round = (n: Money): Money => Math.round(n * 100) / 100;

export interface ProfitInput {
  revenue: Money;
  directCosts: Money;
  indirectCosts: Money;
  operationalCosts: Money;
}

export interface ProfitOutput {
  grossProfit: Money;     // receita - custo direto
  operatingProfit: Money; // - custos indiretos
  netProfit: Money;       // - operacional
  margin: number;         // % sobre receita (0–100)
}

/** Lucro real = Receita - (Diretos + Indiretos + Operacional) */
export function computeProfit(input: ProfitInput): ProfitOutput {
  const grossProfit = round(input.revenue - input.directCosts);
  const operatingProfit = round(grossProfit - input.indirectCosts);
  const netProfit = round(operatingProfit - input.operationalCosts);
  const margin = input.revenue > 0 ? round((netProfit / input.revenue) * 100) : 0;
  return { grossProfit, operatingProfit, netProfit, margin };
}

export interface PartnerShare {
  partnerId: string;
  /** % do lucro distribuível (0–100) */
  share: number;
}

export interface PartnerDistribution {
  partnerId: string;
  share: number;
  amount: Money;
}

export interface DistributionResult {
  distributable: Money;       // total distribuído entre sócios
  retained: Money;            // saldo retido na empresa
  perPartner: PartnerDistribution[];
}

/**
 * Distribui o lucro líquido segundo as cotas dos sócios.
 *
 * O total das `share` pode somar < 100. O que sobra fica RETIDO na empresa.
 * Ex.: 25% sócio A + 25% sócio B + 50% retido = regra real do projeto.
 */
export function distributeProfit(
  netProfit: Money,
  partners: PartnerShare[],
): DistributionResult {
  if (netProfit <= 0) {
    return {
      distributable: 0,
      retained: round(netProfit),
      perPartner: partners.map((p) => ({ partnerId: p.partnerId, share: p.share, amount: 0 })),
    };
  }

  const perPartner: PartnerDistribution[] = partners.map((p) => ({
    partnerId: p.partnerId,
    share: p.share,
    amount: round((netProfit * p.share) / 100),
  }));

  const distributable = round(perPartner.reduce((s, p) => s + p.amount, 0));
  const retained = round(netProfit - distributable);

  return { distributable, retained, perPartner };
}

/**
 * Saldo individual de um sócio:
 *   distribuído acumulado - retiradas acumuladas.
 * A retirada de um sócio nunca afeta o saldo dos demais.
 */
export function partnerBalance(distributedTotal: Money, withdrawnTotal: Money): Money {
  return round(distributedTotal - withdrawnTotal);
}

/** Custo de tempo de um sócio em um projeto. */
export function timeCost(hours: number, hourlyRate: Money): Money {
  return round(hours * hourlyRate);
}
