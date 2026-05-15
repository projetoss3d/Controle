import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middlewares/auth";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { AppError } from "../../shared/http/AppError";

export const timeEntriesRouter = Router();
timeEntriesRouter.use(requireAuth);

const createSchema = z.object({
  partnerId: z.string(),
  projectId: z.string(),
  hours: z.number().positive(),
  hourlyRate: z.number().nonnegative().optional(),
  workedAt: z.string().datetime(),
  notes: z.string().optional(),
});

timeEntriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const items = await prisma.timeEntry.findMany({
      where: { tenantId: req.auth.tenantId },
      include: { partner: true, project: true },
      orderBy: { workedAt: "desc" },
    });
    res.json(items);
  }),
);

timeEntriesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const data = createSchema.parse(req.body);

    const partner = await prisma.partner.findFirst({
      where: { id: data.partnerId, tenantId: req.auth.tenantId },
    });
    if (!partner) throw new AppError("Partner not found", 404);

    const rate = data.hourlyRate ?? Number(partner.hourlyRate ?? 0);
    const created = await prisma.timeEntry.create({
      data: {
        tenantId: req.auth.tenantId,
        partnerId: data.partnerId,
        projectId: data.projectId,
        hours: data.hours,
        hourlyRate: rate,
        workedAt: new Date(data.workedAt),
        notes: data.notes,
      },
    });
    res.status(201).json(created);
  }),
);
