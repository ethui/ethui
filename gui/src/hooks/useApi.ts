import useSWR, { SWRResponse } from "swr";

const PORT = import.meta.env.VITE_IRON_HTTP_PORT || "9003";

type Parameters = Record<string, string | bigint | number | undefined>;

export function useApi<T>(
  endpoint: string,
  query: Parameters,
): SWRResponse<T, unknown> {
  return useSWR([endpoint, query], fetcher<T>);
}

async function fetcher<T>([endpoint, query]: [string, Parameters]): Promise<T> {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    searchParams.append(key, value ? value.toString() : "");
  }

  const fullUrl = `http://localhost:${PORT}/iron${endpoint}?${searchParams.toString()}`;

  return fetch(fullUrl).then((res) => res.json());
}
