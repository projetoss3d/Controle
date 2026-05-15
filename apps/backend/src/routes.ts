import { Router } from "express";
import { authRouter } from "./modules/auth/auth.controller";
import { partnersRouter } from "./modules/partners/partners.controller";
import { customersRouter } from "./modules/customers/customers.controller";
import { projectsRouter } from "./modules/projects/projects.controller";
import { revenuesRouter } from "./modules/revenues/revenues.controller";
import { expensesRouter } from "./modules/expenses/expenses.controller";
import { dashboardRouter } from "./modules/dashboard/dashboard.controller";

export const routes = Router();

routes.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

routes.use("/auth", authRouter);
routes.use("/partners", partnersRouter);
routes.use("/customers", customersRouter);
routes.use("/projects", projectsRouter);
routes.use("/revenues", revenuesRouter);
routes.use("/expenses", expensesRouter);
routes.use("/dashboard", dashboardRouter);
