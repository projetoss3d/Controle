import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../shared/http/AppError";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: "ValidationError",
      message: "Invalid request payload",
      issues: err.issues,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: err.code ?? "AppError",
      message: err.message,
      details: err.details,
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error("[unhandled]", err);
  res.status(500).json({ error: "InternalServerError", message: "Unexpected error" });
}
