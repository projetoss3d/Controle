import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../shared/http/AppError";
import type { Role } from "@prisma/client";

export interface AuthPayload {
  userId: string;
  tenantId: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

/** Exige um JWT válido. Popula req.auth com { userId, tenantId, role }. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError("Missing or invalid Authorization header", 401, "Unauthorized");
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.jwt.secret) as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    throw new AppError("Invalid or expired token", 401, "Unauthorized");
  }
}

/** RBAC: limita acesso a papéis específicos. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) throw new AppError("Unauthenticated", 401);
    if (!roles.includes(req.auth.role)) {
      throw new AppError("Forbidden", 403, "Forbidden");
    }
    next();
  };
}
