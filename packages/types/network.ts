import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

const rpcAndChainIdSchema = z
  .object({
    http_url: z.string().min(1).url(),
    dedup_chain_id: z.object({
      chain_id: z.coerce.number().positive(),
      dedup_id: z.coerce.number().optional(),
    }),
  })
  .superRefine(async ({ http_url, dedup_chain_id: { chain_id } }, ctx) => {
    if (!http_url || !chain_id || http_url === "") return;

    try {
      const rpcChainId = await invoke<number>(
        "networks_chain_id_from_provider",
        { url: http_url },
      );

      if (chain_id !== rpcChainId) {
        ctx.addIssue({
          path: ["http_url"],
          message: `this RPC's chain id seems to be ${rpcChainId}, expected ${chain_id}`,
          code: z.ZodIssueCode.custom,
        });
      }
    } catch (_e) {
      ctx.addIssue({
        path: ["http_url"],
        message: "url seems to be offline",
        code: z.ZodIssueCode.custom,
      });
    }
  });

export const networkSchema = z.intersection(
  z.object({
    name: z.string().min(1),
    explorer_url: z.string().optional().nullable(),
    ws_url: z.string().url().nullable().optional(),
    currency: z.string().min(1),
    decimals: z.number(),
    warnings: z.string().optional(),
  }),
  rpcAndChainIdSchema,
);

export type NetworkInputs = z.infer<typeof networkSchema>;
export type Network = NetworkInputs & {
  status: "unknown" | "online" | "offline";
};
