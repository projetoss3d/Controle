import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.BACKEND_PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwt: {
    secret: required("JWT_SECRET", "dev-secret-change-me"),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  },
  cors: {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  },
  storage: {
    driver: (process.env.STORAGE_DRIVER ?? "local") as "local" | "s3",
    s3: {
      endpoint: process.env.S3_ENDPOINT ?? "",
      region: process.env.S3_REGION ?? "",
      bucket: process.env.S3_BUCKET ?? "",
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  },
  ai: {
    provider: (process.env.AI_PROVIDER ?? "disabled") as
      | "disabled"
      | "openai"
      | "local",
    baseUrl: process.env.AI_BASE_URL ?? "",
    apiKey: process.env.AI_API_KEY ?? "",
  },
};
