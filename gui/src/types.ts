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

<<<<<<< HEAD
export type Network = z.infer<typeof networkSchema.shape.networks>[number];

export type Address = `0x${string}`;

||||||| 99ee597
export type Network = z.infer<typeof networkSchema.shape.networks>[number];

=======
>>>>>>> main
export const walletSchema = z.object({
  name: z.string().min(1),
  dev: z.boolean().default(false),
  mnemonic: z.string().regex(/^(\w+\s){11}\w+$/, {
    message: "Must be a 12-word phrase",
  }),
  derivationPath: z.string().regex(/^m\/(\d+'?\/)+\d+$/, {
    message: "invalid path format",
  }),
  count: z.number().int().min(1),
});

<<<<<<< HEAD
export type Wallet = z.infer<typeof walletSchema> & { currentPath?: string };

export const walletsSchema = z.object({
  wallets: z.array(walletSchema),
});

export type Wallets = z.infer<typeof walletsSchema>;
||||||| 99ee597
export type Address = `0x${string}`;
export type Wallet = z.infer<typeof walletSchema>;
=======
export const generalSettingsSchema = z.object({
  darkMode: z.enum(["auto", "dark", "light"]),
});

export type Address = `0x${string}`;
export type Network = z.infer<typeof networkSchema.shape.networks>[number];
export type Wallet = z.infer<typeof walletSchema>;
export type GeneralSettings = z.infer<typeof generalSettingsSchema>;
>>>>>>> main
