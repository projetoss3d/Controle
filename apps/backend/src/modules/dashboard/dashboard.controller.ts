import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { dashboardService } from "./dashboard.service";
import { AppError } from "../../shared/http/AppError";

export const dashboardRouter = Router();

const periodSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

dashboardRouter.use(requireAuth);

dashboardRouter.get(
  "/overview",
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    const { from, to } = periodSchema.parse(req.query);

    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const result = await dashboardService.overview({
      tenantId: req.auth.tenantId,
      from: from ? new Date(from) : defaultFrom,
      to: to ? new Date(to) : defaultTo,
    });
    res.json(result);
  }),
);
