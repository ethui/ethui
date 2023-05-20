import { z } from "zod";

// const formSchema = schema.shape.network;
export const networkSchema = z.object({
  networks: z.array(
    z
      .object({
        name: z.string().min(1),
        dev: z.boolean().default(false),
        explorer_url: z.string().optional().nullable(),
        http_url: z.string().min(1),
        ws_url: z.string().nullable().optional(),
        currency: z.string().min(1),
        chain_id: z.number(),
        decimals: z.number(),
      })
      .refine((data) => !data.dev || !data.ws_url || data.ws_url.length > 0, {
        path: ["ws_url"],
        message: "WebSockets are mandatory for dev networks",
      })
  ),
});

export type Network = z.infer<typeof networkSchema.shape.networks>[number];

export type Address = `0x${string}`;

export const walletSchema = z.object({
  mnemonic: z.string().regex(/^(\w+\s){11}\w+$/, {
    message: "Must be a 12-word phrase",
  }),
  derivationPath: z.string().regex(/^m\/(\d+'?\/)+\d+$/, {
    message: "invalid path format",
  }),
  idx: z.number().int().min(0).max(4),
});

export const foundrySettingsSchema = z.object({
  abiWatch: z.boolean().default(false),
  abiWatchPath: z.string().optional(),
});

export type FoundrySettings = z.infer<typeof foundrySettingsSchema>;
