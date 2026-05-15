import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middlewares/auth";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { AppError } from "../../shared/http/AppError";
import { computeProfit, timeCost } from "../../shared/finance/calculator";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1),
  customerId: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).default("ACTIVE"),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
});

projectsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const items = await prisma.project.findMany({
      where: { tenantId: req.auth.tenantId },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  }),
);

projectsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const data = createSchema.parse(req.body);
    const created = await prisma.project.create({
      data: {
        tenantId: req.auth.tenantId,
        name: data.name,
        customerId: data.customerId,
        description: data.description,
        status: data.status,
        startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
        endedAt: data.endedAt ? new Date(data.endedAt) : undefined,
      },
    });
    res.status(201).json(created);
  }),
);

/** P&L do projeto: receita - custos diretos/indiretos/operacionais - custo de tempo. */
projectsRouter.get(
  "/:id/pnl",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, tenantId: req.auth.tenantId },
    });
    if (!project) throw new AppError("Project not found", 404);

    const [revenues, expenses, time] = await Promise.all([
      prisma.revenue.findMany({
        where: { tenantId: req.auth.tenantId, projectId: project.id },
        select: { amount: true, directCost: true },
      }),
      prisma.expense.findMany({
        where: { tenantId: req.auth.tenantId, projectId: project.id },
        select: { amount: true, nature: true },
      }),
      prisma.timeEntry.findMany({
        where: { tenantId: req.auth.tenantId, projectId: project.id },
        select: { hours: true, hourlyRate: true },
      }),
    ]);

    const revenue = revenues.reduce((s, r) => s + Number(r.amount), 0);
    let direct = revenues.reduce((s, r) => s + Number(r.directCost), 0);
    let indirect = 0;
    let operational = 0;
    for (const e of expenses) {
      const v = Number(e.amount);
      if (e.nature === "DIRECT") direct += v;
      else if (e.nature === "INDIRECT") indirect += v;
      else operational += v;
    }
    // Custo do tempo dos sócios entra como custo direto.
    const totalTimeCost = time.reduce((s, t) => s + timeCost(Number(t.hours), Number(t.hourlyRate)), 0);
    direct += totalTimeCost;

    const profit = computeProfit({
      revenue,
      directCosts: direct,
      indirectCosts: indirect,
      operationalCosts: operational,
    });

    res.json({
      project,
      totals: {
        revenue,
        costs: { direct, indirect, operational, time: totalTimeCost },
        profit,
      },
    });
  }),
);
