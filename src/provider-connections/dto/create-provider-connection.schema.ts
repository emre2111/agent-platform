import { z } from "zod";

export const createProviderConnectionSchema = z.object({
  provider: z
    .string()
    .trim()
    .min(2, "provider is required")
    .max(64, "provider is too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "provider format is invalid")
    .transform((value) => value.toLowerCase()),
  apiKey: z
    .string()
    .trim()
    .min(12, "apiKey is too short")
    .max(4096, "apiKey is too long"),
});

export type CreateProviderConnectionInput = z.infer<
  typeof createProviderConnectionSchema
>;
