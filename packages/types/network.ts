import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

export const networkIdSchema = z.object({
  chain_id: z.number().positive(),
  dedup_id: z.number().positive().optional(),
});

export const networkSchema = z
  .object({
    name: z.string().min(1),
    explorer_url: z.string().optional().nullable(),
    http_url: z.url().min(1),
    ws_url: z.url().nullable().optional(),
    currency: z.string().min(1),
    decimals: z.number(),
    warnings: z.string().optional(),
    id: networkIdSchema,
  })

  // ensure RPC is online, and chain_id matches
  .superRefine(async ({ http_url, id: { chain_id } }, ctx) => {
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
          code: "custom",
        });
      }
    } catch (_e) {
      ctx.addIssue({
        path: ["http_url"],
        message: "url seems to be offline",
        code: "custom",
      });
    }
  });

export type NetworkInputs = z.infer<typeof networkSchema>;
export type NetworkId = z.infer<typeof networkIdSchema>;
export type Network = NetworkInputs & {
  status: "unknown" | "online" | "offline";
};
