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
  abiWatchPath: z.string().optional().nullable(),
  alchemyApiKey: z.string().optional().nullable(),
  etherscanApiKey: z.string().optional().nullable(),
  hideEmptyTokens: z.boolean(),
  aliases: z.record(z.string()),
  fastMode: z.boolean(),
  autostart: z.boolean(),
  startMinimized: z.boolean(),
  checkForUpdates: z.boolean(),
  onboarding: onboardingSchema,
  rustLog: z.string(),
  runLocalStacks: z.boolean(),
});

export type OnboardingStepKey = z.infer<typeof onboardingSteps>;
export type Onboarding = z.infer<typeof onboardingSchema>;
export type GeneralSettings = z.infer<typeof generalSettingsSchema>;
