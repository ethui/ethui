import browser from "webextension-polyfill";

export async function write(key: string, value: unknown) {
  browser.storage.local.set({ [key]: value });
}

export async function read<T>(key: string, defaultVal: T): Promise<T> {
  const res = await browser.storage.local.get(key);
  return res.length > 0 ? (res as unknown as T) : defaultVal;
}
