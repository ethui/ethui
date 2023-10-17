import qs from "qs";

export type Parameters = Record<string, unknown>;

const HOST = import.meta.env.VITE_IRON_HTTP_SERVER_ENDPOINT || "localhost:9003";

export async function get<T>(
  endpoint: string,
  query: Parameters = {},
): Promise<T> {
  return getFetcher<T>([endpoint, query]);
}

export async function post<T = void>(
  endpoint: string,
  body: Parameters = {},
): Promise<T> {
  return await writeFetcher<T>(["post", endpoint, body]);
}

export async function del<T = void>(
  endpoint: string,
  body: Parameters = {},
): Promise<T> {
  return await writeFetcher<T>(["delete", endpoint, body]);
}

export async function put<T = void>(
  endpoint: string,
  body: Parameters = {},
): Promise<T> {
  return await writeFetcher<T>(["put", endpoint, body]);
}

export async function getFetcher<T>([endpoint, query]: [
  string,
  Parameters,
]): Promise<T> {
  const fullUrl = `http://${HOST}/iron${endpoint}?${qs.stringify(query)}`;

  return fetch(fullUrl).then((res) => res.json());
}

export async function writeFetcher<T = void>([method, endpoint, body]: [
  string,
  string,
  Parameters,
]): Promise<T> {
  const fullUrl = `http://${HOST}/iron${endpoint}`;

  return fetch(fullUrl, {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }).then((res) => res.json());
}
