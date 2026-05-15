import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { AppError } from "../../shared/http/AppError";

/** Endpoints de listas/lookups: categorias de despesa, tipos de serviço. */
export const lookupsRouter = Router();
lookupsRouter.use(requireAuth);

lookupsRouter.get(
  "/expense-categories",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const items = await prisma.expenseCategory.findMany({
      where: { tenantId: req.auth.tenantId, active: true },
      orderBy: { label: "asc" },
    });
    res.json(items);
  }),
);

lookupsRouter.post(
  "/expense-categories",
  requireRole("ADMIN", "PARTNER"),
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const body = z.object({ key: z.string().min(1), label: z.string().min(1) }).parse(req.body);
    const created = await prisma.expenseCategory.upsert({
      where: { tenantId_key: { tenantId: req.auth.tenantId, key: body.key } },
      update: { label: body.label, active: true },
      create: { tenantId: req.auth.tenantId, ...body },
    });
    res.status(201).json(created);
  }),
);

lookupsRouter.get(
  "/service-types",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const items = await prisma.serviceType.findMany({
      where: { tenantId: req.auth.tenantId, active: true },
      orderBy: { label: "asc" },
    });
    res.json(items);
  }),
);
