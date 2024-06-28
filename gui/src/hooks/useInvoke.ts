import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api";

type TArgs = Record<string, unknown>;

export const useInvoke = <TResult>(
  command: string,
  args: TArgs = {},
  opts = {},
): UseQueryResult<TResult, unknown> => {
  return useQuery({
    queryKey: [command, args],
    queryFn: () => invoke<TResult>(command, args),
    ...opts,
  });
};
