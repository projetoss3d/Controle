import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { AppError } from "../../shared/http/AppError";

export const partnersRouter = Router();
partnersRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["WORKING", "INVESTOR", "PRO_LABORE"]).default("WORKING"),
  profitShare: z.number().min(0).max(100).default(0),
  hourlyRate: z.number().nonnegative().optional(),
  proLabore: z.number().nonnegative().optional(),
});

partnersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const items = await prisma.partner.findMany({
      where: { tenantId: req.auth.tenantId, active: true },
      orderBy: { name: "asc" },
    });
    res.json(items);
  }),
);

partnersRouter.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const data = createSchema.parse(req.body);
    const created = await prisma.partner.create({
      data: { tenantId: req.auth.tenantId, ...data },
    });
    res.status(201).json(created);
  }),
);

const withdrawalSchema = z.object({
  partnerId: z.string(),
  type: z.enum(["ADVANCE", "PRO_LABORE", "PROFIT_DISTRIBUTION", "LOAN", "OTHER"]).default("ADVANCE"),
  amount: z.number().positive(),
  occurredAt: z.string().datetime(),
  description: z.string().optional(),
});

/**
 * Registra uma retirada para UM sócio específico.
 * IMPORTANTE: a retirada de um sócio só afeta o saldo individual dele.
 * O cálculo de saldo é feito sob demanda em /dashboard.
 */
partnersRouter.post(
  "/withdrawals",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const data = withdrawalSchema.parse(req.body);

    const partner = await prisma.partner.findFirst({
      where: { id: data.partnerId, tenantId: req.auth.tenantId },
    });
    if (!partner) throw new AppError("Partner not found", 404);

    const created = await prisma.withdrawal.create({
      data: {
        tenantId: req.auth.tenantId,
        partnerId: data.partnerId,
        type: data.type,
        amount: data.amount,
        occurredAt: new Date(data.occurredAt),
        description: data.description,
      },
    });
    res.status(201).json(created);
  }),
);

partnersRouter.get(
  "/:id/withdrawals",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const items = await prisma.withdrawal.findMany({
      where: { tenantId: req.auth.tenantId, partnerId: req.params.id },
      orderBy: { occurredAt: "desc" },
    });
    res.json(items);
  }),
);
