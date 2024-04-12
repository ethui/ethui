import {
  UseSuspenseQueryResult,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api";

type TArgs = Record<string, unknown>;

export const useInvoke = <TResult>(
  command: string,
  args: TArgs = {},
  opts = {},
): UseSuspenseQueryResult<TResult, unknown> => {
  return useSuspenseQuery({
    queryKey: [command, args],
    queryFn: () => invoke<TResult>(command, args),
    ...opts,
  });
};
