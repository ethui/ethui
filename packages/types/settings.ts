import { z } from "zod";

const onboardingSteps = z.enum([
  "alchemy",
  "wallet",
  "extension",
  "etherscan",
  "foundry",
]);

export const onboardingSchema = z.object({
  hidden: z.boolean(),
  steps: z.record(onboardingSteps, z.boolean()),
});

export const generalSettingsSchema = z.object({
  darkMode: z.enum(["auto", "dark", "light"]),
  autostart: z.boolean(),
  abiWatch: z.boolean(),
  abiWatchPath: z.string().optional().nullable(),
  alchemyApiKey: z.string().optional().nullable(),
  etherscanApiKey: z.string().optional().nullable(),
  hideEmptyTokens: z.boolean(),
  startMinimized: z.boolean(),
  checkForUpdates: z.boolean(),
  fastMode: z.boolean(),
  onboarding: onboardingSchema,
  rustLog: z.string().optional(),
  runLocalStacks: z.boolean(),
  analyticsId: z.string().optional().nullable(),
});

export type OnboardingStepKey = z.infer<typeof onboardingSteps>;
export type Onboarding = z.infer<typeof onboardingSchema>;
export type GeneralSettings = z.infer<typeof generalSettingsSchema>;
