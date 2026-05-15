import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middlewares/auth";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { AppError } from "../../shared/http/AppError";

export const expensesRouter = Router();
expensesRouter.use(requireAuth);

const createSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  occurredAt: z.string().datetime(),
  kind: z.enum(["FIXED", "VARIABLE"]).default("VARIABLE"),
  nature: z.enum(["DIRECT", "INDIRECT", "OPERATIONAL"]).default("OPERATIONAL"),
  recurring: z.boolean().default(false),
  recurrenceDay: z.number().int().min(1).max(31).optional(),
  categoryId: z.string().optional(),
  customerId: z.string().optional(),
  projectId: z.string().optional(),
  revenueId: z.string().optional(),
  notes: z.string().optional(),
});

expensesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const items = await prisma.expense.findMany({
      where: { tenantId: req.auth.tenantId },
      include: { category: true, project: true, customer: true },
      orderBy: { occurredAt: "desc" },
    });
    res.json(items);
  }),
);

expensesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const data = createSchema.parse(req.body);
    const created = await prisma.expense.create({
      data: {
        tenantId: req.auth.tenantId,
        description: data.description,
        amount: data.amount,
        occurredAt: new Date(data.occurredAt),
        kind: data.kind,
        nature: data.nature,
        recurring: data.recurring,
        recurrenceDay: data.recurrenceDay,
        categoryId: data.categoryId,
        customerId: data.customerId,
        projectId: data.projectId,
        revenueId: data.revenueId,
        notes: data.notes,
      },
    });
    res.status(201).json(created);
  }),
);
