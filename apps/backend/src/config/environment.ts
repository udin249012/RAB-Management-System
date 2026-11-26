import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
  USE_FIREBASE_EMULATOR: z
    .enum(["true", "false"])
    .default("false")
    .transform((val) => val === "true"),
  FIRESTORE_EMULATOR_HOST: z.string().default("127.0.0.1:8080"),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().default("127.0.0.1:9099"),
  FIREBASE_STORAGE_EMULATOR_HOST: z.string().default("127.0.0.1:9199"),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
});

export type AppEnvironment = z.infer<typeof environmentSchema>;

export function loadEnvironment(): AppEnvironment {
  const parsed = environmentSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${formatted}`);
  }
  return parsed.data;
}
