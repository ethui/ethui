import { type UseQueryResult, useQuery } from "@tanstack/react-query";

const PORT = import.meta.env.VITE_IRON_HTTP_PORT || "9003";

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
        `http://localhost:${PORT}/iron${endpoint}?${params.toString()}`,
      );
      return res.json();
    },
  });
}
