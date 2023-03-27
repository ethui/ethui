import { invoke } from "@tauri-apps/api/tauri";
import useSWR, { SWRResponse } from "swr";

type TArgs = Record<string, unknown>;

export const useInvoke = <TResult>(
  command: string,
  args: TArgs = {}
): SWRResponse<TResult, unknown> => {
  return useSWR<TResult>([command, args], invokeFetcher);
};

const invokeFetcher = async <TResult>([command, args]: [
  string,
  TArgs
]): Promise<TResult> => {
  return invoke<TResult>(command, args);
};
