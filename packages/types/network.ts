import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

export const networkSchema = z
  .object({
    name: z.string().min(1),
    explorer_url: z.string().optional().nullable(),
    http_url: z.string().min(1).url(),
    ws_url: z.string().nullable().optional(),
    currency: z.string().min(1),
    chain_id: z.number().positive(),
    decimals: z.number(),
    warnings: z.string().optional(),
  })
  .superRefine(async ({ http_url, chain_id }, ctx) => {
    if (!http_url || !chain_id) return;

    try {
      const rpcChainId = await invoke<number>(
        "networks_chain_id_from_provider",
        { url: http_url },
      );

      if (chain_id !== rpcChainId) {
        ctx.addIssue({
          path: ["http_url"],
          message: `returned chain id ${rpcChainId}`,
          code: z.ZodIssueCode.custom,
        });
      }
    } catch (_e) {
      ctx.addIssue({
        path: ["http_url"],
        message: "Warning: the provided HTTP RPC is not responding",
        code: z.ZodIssueCode.custom,
      });
    }
  });

export type Network = z.infer<typeof networkSchema>;
