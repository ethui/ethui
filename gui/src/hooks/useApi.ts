import useSWR, { SWRResponse } from "swr";

import type { Parameters } from "@/api";
import { getFetcher } from "@/api";

export function useApi<T>(
  endpoint: string,
  query: Parameters = {},
): SWRResponse<T, unknown> {
  return useSWR([endpoint, query], getFetcher<T>);
}
