export type Parameters = Record<string, unknown>;

const HOST = import.meta.env.VITE_IRON_HTTP_SERVER_ENDPOINT || "localhost:9003";

export async function get<T>(
  endpoint: string,
  query: Parameters = {},
): Promise<T> {
  return getFetcher<T>([endpoint, query]);
}

export async function post(
  endpoint: string,
  body: Parameters = {},
): Promise<string> {
  return await writeFetcher(["post", endpoint, body]);
}

export async function del(
  endpoint: string,
  body: Parameters = {},
): Promise<string> {
  return await writeFetcher(["delete", endpoint, body]);
}

export async function put(
  endpoint: string,
  body: Parameters = {},
): Promise<string> {
  return await writeFetcher(["put", endpoint, body]);
}

export async function getFetcher<T>([endpoint, query]: [
  string,
  Parameters,
]): Promise<T> {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    searchParams.append(key, value ? value.toString() : "");
  }

  const fullUrl = `http://${HOST}/iron${endpoint}?${searchParams.toString()}`;

  return fetch(fullUrl).then((res) => res.json());
}

export async function writeFetcher([method, endpoint, body]: [
  string,
  string,
  Parameters,
]): Promise<string> {
  const fullUrl = `http://${HOST}/iron${endpoint}`;

  return fetch(fullUrl, {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }).then((res) => res.text());
}
