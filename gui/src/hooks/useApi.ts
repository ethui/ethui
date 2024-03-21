import { type UseQueryResult, useQuery } from "@tanstack/react-query";

const { VITE_ethui_HTTP_PORT, VITE_ethui_DEV_HTTP_PORT, NODE_ENV } = import.meta
  .env;

const PORT =
  NODE_ENV === "production"
    ? VITE_ethui_HTTP_PORT || "9003"
    : VITE_ethui_DEV_HTTP_PORT || "9103";

type Parameters = Record<string, string | bigint | number | undefined>;

export function useApi<T>(
  endpoint: string,
  query: Parameters,
): UseQueryResult<T, unknown> {
  return useQuery({
    queryKey: [endpoint, query],
    queryFn: async () => {
      const params = Object.entries(query).reduce((acc, [key, value]) => {
        acc.append(key, value ? value.toString() : "");
        return acc;
      }, new URLSearchParams());

      const res = await fetch(
        `http://localhost:${PORT}/ethui${endpoint}?${params.toString()}`,
      );
      return res.json();
    },
  });
}
