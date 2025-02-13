import { z } from "zod";

export const networkSchema = z.object({
  name: z.string().min(1),
  explorer_url: z.string().optional().nullable(),
  http_url: z.string().min(1),
  ws_url: z.string().nullable().optional(),
  currency: z.string().min(1),
  chain_id: z.number(),
  decimals: z.number(),
});

export type Network = z.infer<typeof networkSchema>;
