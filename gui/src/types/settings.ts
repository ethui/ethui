import { z } from "zod";

export const generalSettingsSchema = z.object({
  darkMode: z.enum(["auto", "dark", "light"]),
  autostart: z.boolean(),
  abiWatch: z.boolean(),
  abiWatchPath: z.string().optional().nullable(),
  alchemyApiKey: z.string().optional().nullable(),
  etherscanApiKey: z.string().optional().nullable(),
  hideEmptyTokens: z.boolean(),
  onboarded: z.boolean(),
  homepageTourCompleted: z.boolean(),
  fastMode: z.boolean(),
});

export type GeneralSettings = z.infer<typeof generalSettingsSchema>;
