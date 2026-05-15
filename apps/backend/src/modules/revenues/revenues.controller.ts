import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middlewares/auth";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { AppError } from "../../shared/http/AppError";

export const revenuesRouter = Router();
revenuesRouter.use(requireAuth);

const installmentSchema = z.object({
  number: z.number().int().positive(),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
});

const createSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  directCost: z.number().min(0).default(0),
  issuedAt: z.string().datetime(),
  customerId: z.string().optional(),
  projectId: z.string().optional(),
  serviceTypeId: z.string().optional(),
  partnerInChargeId: z.string().optional(),
  notes: z.string().optional(),
  installments: z.array(installmentSchema).optional(),
});

/** Lista receitas do tenant, ordenadas pela data. Suporta filtros básicos. */
revenuesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const { customerId, projectId, status, from, to } = req.query;

    const items = await prisma.revenue.findMany({
      where: {
        tenantId: req.auth.tenantId,
        customerId: typeof customerId === "string" ? customerId : undefined,
        projectId: typeof projectId === "string" ? projectId : undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: typeof status === "string" ? (status as any) : undefined,
        issuedAt:
          from || to
            ? {
                gte: typeof from === "string" ? new Date(from) : undefined,
                lte: typeof to === "string" ? new Date(to) : undefined,
              }
            : undefined,
      },
      include: { installments: true, customer: true, project: true },
      orderBy: { issuedAt: "desc" },
    });
    res.json(items);
  }),
);

revenuesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const data = createSchema.parse(req.body);

    const created = await prisma.revenue.create({
      data: {
        tenantId: req.auth.tenantId,
        description: data.description,
        amount: data.amount,
        directCost: data.directCost,
        issuedAt: new Date(data.issuedAt),
        customerId: data.customerId,
        projectId: data.projectId,
        serviceTypeId: data.serviceTypeId,
        partnerInChargeId: data.partnerInChargeId,
        notes: data.notes,
        installments: data.installments
          ? {
              create: data.installments.map((i) => ({
                tenantId: req.auth!.tenantId,
                number: i.number,
                amount: i.amount,
                dueDate: new Date(i.dueDate),
              })),
            }
          : undefined,
      },
      include: { installments: true },
    });
    res.status(201).json(created);
  }),
);

const payInstallmentSchema = z.object({
  paidAt: z.string().datetime().optional(),
});

/** Marca parcela como paga e atualiza status da receita-mãe. */
revenuesRouter.post(
  "/installments/:id/pay",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const body = payInstallmentSchema.parse(req.body);
    const installment = await prisma.installment.findFirst({
      where: { id: req.params.id, tenantId: req.auth.tenantId },
    });
    if (!installment) throw new AppError("Installment not found", 404);

    const updated = await prisma.installment.update({
      where: { id: installment.id },
      data: { status: "PAID", paidAt: body.paidAt ? new Date(body.paidAt) : new Date() },
    });

    // Reavalia status da receita
    const siblings = await prisma.installment.findMany({
      where: { revenueId: installment.revenueId },
    });
    const allPaid = siblings.every((s) => s.status === "PAID");
    const anyPaid = siblings.some((s) => s.status === "PAID");
    await prisma.revenue.update({
      where: { id: installment.revenueId },
      data: { status: allPaid ? "PAID" : anyPaid ? "PARTIAL" : "CONTRACTED" },
    });

    res.json(updated);
  }),
);
