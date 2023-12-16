import { invoke } from "@tauri-apps/api";
import useSWR from "swr";
import type { SWRConfiguration, SWRResponse } from "swr";

type TArgs = Record<string, unknown>;

export const useInvoke = <TResult>(
  command: string,
  args: TArgs = {},
  props?: SWRConfiguration,
): SWRResponse<TResult, unknown> => {
  return useSWR<TResult>([command, args], invokeFetcher, props);
};

const invokeFetcher = <TResult>([command, args]: [
  string,
  TArgs,
]): Promise<TResult> => {
  return invoke<TResult>(command, args);
};
