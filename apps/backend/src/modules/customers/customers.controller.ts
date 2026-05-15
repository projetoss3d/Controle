import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middlewares/auth";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { AppError } from "../../shared/http/AppError";
import { computeProfit } from "../../shared/finance/calculator";

export const customersRouter = Router();
customersRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  document: z.string().optional(),
  notes: z.string().optional(),
});

customersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const items = await prisma.customer.findMany({
      where: { tenantId: req.auth.tenantId, active: true },
      orderBy: { name: "asc" },
    });
    res.json(items);
  }),
);

customersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const data = createSchema.parse(req.body);
    const created = await prisma.customer.create({
      data: { tenantId: req.auth.tenantId, ...data },
    });
    res.status(201).json(created);
  }),
);

/** Dashboard individual do cliente: faturamento, custo, lucro real. */
customersRouter.get(
  "/:id/dashboard",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, tenantId: req.auth.tenantId },
    });
    if (!customer) throw new AppError("Customer not found", 404);

    const [revenues, expenses] = await Promise.all([
      prisma.revenue.findMany({
        where: { tenantId: req.auth.tenantId, customerId: customer.id },
        select: { amount: true, directCost: true },
      }),
      prisma.expense.findMany({
        where: { tenantId: req.auth.tenantId, customerId: customer.id },
        select: { amount: true, nature: true },
      }),
    ]);

    const revenue = revenues.reduce((s, r) => s + Number(r.amount), 0);
    const directFromRevenues = revenues.reduce((s, r) => s + Number(r.directCost), 0);
    let direct = directFromRevenues;
    let indirect = 0;
    let operational = 0;
    for (const e of expenses) {
      const v = Number(e.amount);
      if (e.nature === "DIRECT") direct += v;
      else if (e.nature === "INDIRECT") indirect += v;
      else operational += v;
    }

    const profit = computeProfit({
      revenue,
      directCosts: direct,
      indirectCosts: indirect,
      operationalCosts: operational,
    });

    res.json({
      customer,
      totals: {
        revenue,
        revenueCount: revenues.length,
        averageTicket: revenues.length ? Math.round((revenue / revenues.length) * 100) / 100 : 0,
        costs: { direct, indirect, operational },
        profit,
      },
    });
  }),
);
