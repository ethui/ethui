import { z } from "zod";

export const networkIdSchema = z.object({
  chain_id: z.number("Invalid number").positive(),
  dedup_id: z.number().positive().optional(),
});

export const networkSchema = z.object({
  name: z.string().min(1, "Invalid name"),
  explorer_url: z.url().optional().nullable(),
  http_url: z.url().min(1),
  ws_url: z.url().nullable().optional(),
  currency: z.string().min(1, "Invalid currency"),
  decimals: z.number("Invalid number"),
  id: networkIdSchema,
});

export type NetworkInputs = z.infer<typeof networkSchema>;
export type NetworkId = z.infer<typeof networkIdSchema>;
export type Network = NetworkInputs & {
  status: "unknown" | "online" | "offline";
};

export const stacksSchema = z.object({ slug: z.string() });
export type StacksInputs = z.infer<typeof stacksSchema>;
