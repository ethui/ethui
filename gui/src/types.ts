import { z } from "zod";

// const formSchema = schema.shape.network;
export const networkSchema = z.object({
  networks: z.array(
    z.object({
      name: z.string().min(1),
      rpc_url: z.string().min(1),
      currency: z.string().min(1),
      chain_id: z.number(),
      decimals: z.number(),
    })
  ),
});

export type Network = z.infer<typeof networkSchema.shape.networks>[number];

export const walletSchema = z.object({
  mnemonic: z.string().regex(/^(\w+\s){11}\w+$/, {
    message: "Must be a 12-word phrase",
  }),
  derivation_path: z.string().regex(/^m\/(\d+'?\/)+\d+$/, {
    message: "invalid path format",
  }),
  idx: z.number().int().min(0).max(3),
});

export type Address = `0x${string}`;
export type Wallet = z.infer<typeof walletSchema>;
