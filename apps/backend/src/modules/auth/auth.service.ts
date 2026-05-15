import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { AppError } from "../../shared/http/AppError";

export interface SignupInput {
  tenantName: string;
  tenantSlug: string;
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
  tenantSlug: string;
}

function signToken(payload: { userId: string; tenantId: string; role: string }): string {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn } as SignOptions);
}

export const authService = {
  /** Cria tenant + admin inicial em uma transação. */
  async signup(input: SignupInput) {
    const existing = await prisma.tenant.findUnique({ where: { slug: input.tenantSlug } });
    if (existing) throw new AppError("Tenant slug already exists", 409);

    const passwordHash = await bcrypt.hash(input.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: input.tenantName, slug: input.tenantSlug },
      });
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: input.name,
          email: input.email.toLowerCase(),
          passwordHash,
          role: "ADMIN",
        },
      });
      return { tenant, user };
    });

    const token = signToken({
      userId: result.user.id,
      tenantId: result.tenant.id,
      role: result.user.role,
    });

    return {
      token,
      user: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role },
      tenant: { id: result.tenant.id, name: result.tenant.name, slug: result.tenant.slug },
    };
  },

  async login(input: LoginInput) {
    const tenant = await prisma.tenant.findUnique({ where: { slug: input.tenantSlug } });
    if (!tenant) throw new AppError("Invalid credentials", 401);

    const user = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: input.email.toLowerCase() } },
    });
    if (!user || !user.active) throw new AppError("Invalid credentials", 401);

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new AppError("Invalid credentials", 401);

    const token = signToken({ userId: user.id, tenantId: tenant.id, role: user.role });
    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    };
  },
};
