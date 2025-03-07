import { z } from "zod";

export const onboardingSchema = z.object({
  hidden: z.boolean(),
  createWallet: z.enum(["empty", "done", "skipped"]),
  importWallet: z.enum(["empty", "done", "skipped"]),
  createToken: z.enum(["empty", "done", "skipped"]),
  addToken: z.enum(["empty", "done", "skipped"]),
});

export const generalSettingsSchema = z.object({
  darkMode: z.enum(["auto", "dark", "light"]),
  autostart: z.boolean(),
  abiWatch: z.boolean(),
  abiWatchPath: z.string().optional().nullable(),
  alchemyApiKey: z.string().optional().nullable(),
  etherscanApiKey: z.string().optional().nullable(),
  hideEmptyTokens: z.boolean(),
  fastMode: z.boolean(),
  onboarding: onboardingSchema,
});

export type Onboarding = z.infer<typeof onboardingSchema>;
export type GeneralSettings = z.infer<typeof generalSettingsSchema>;
