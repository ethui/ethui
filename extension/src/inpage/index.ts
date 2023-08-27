import { v4 as uuidv4 } from "@lukeed/uuid";
import { EIP1193Provider, announceProvider } from "mipd";
import { type Duplex } from "stream";

import { WindowPostMessageStream } from "@metamask/post-message-stream";

import { IronProvider } from "./provider";

// URI-encoded SVG logo (symbol-offblack-transparent version of Iron's logo, 96x96)
const icon =
  "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI3LjIuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkNhbWFkYV8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIKCSB2aWV3Qm94PSIwIDAgNjAwIDYwMCIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNjAwIDYwMDsiIHhtbDpzcGFjZT0icHJlc2VydmUiIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiI+CjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+Cgkuc3Qwe2ZpbGw6IzE2MTYxNjt9Cgkuc3Qxe2ZpbGw6I0YxRjFGMTt9Cjwvc3R5bGU+CjxnPgoJPHBvbHlnb24gY2xhc3M9InN0MCIgcG9pbnRzPSIyMTcuMiwzNzIgMjYzLjgsMzcyIDMwMCw0MjEuMSAzMzYuMiwzNzIgMzgyLjgsMzcyIDMwMCwyNjAuOCAJIi8+Cgk8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNDY5LDBIMTMxQzU4LjYsMCwwLDU4LjYsMCwxMzFWNDY5YzAsNzIuMyw1OC42LDEzMSwxMzEsMTMxSDQ2OWM3Mi4zLDAsMTMxLTU4LjYsMTMxLTEzMVYxMzEKCQlDNjAwLDU4LjYsNTQxLjQsMCw0NjksMHogTTM4NCwzNzJsLTg0LDExNGwtODQtMTE0SDEwOGwxOTItMjU4bDE5MiwyNThIMzg0eiIvPgo8L2c+Cjwvc3ZnPgo=";

/* init on load */
init();

/**
 * This can never be async, otherwise window.ethereum won't be injected in time
 * for page load
 */
export function init() {
  initializeProvider();
}

/**
 * injects a `window.ethereum` object
 * conntected to a `WindowPostMessageStream`
 * returns The initialized provider (whether set or not).
 */
export function initializeProvider() {
  const connectionStream = new WindowPostMessageStream({
    name: "iron:provider:inpage",
    target: "iron:provider:contentscript",
  }) as unknown as Duplex;

  const provider = new IronProvider(connectionStream);

  setGlobalProvider(provider);

  announceProvider({
    info: {
      icon,
      name: "Iron",
      rdns: "eth.iron-wallet",
      uuid: uuidv4(),
    },
    provider: provider as EIP1193Provider,
  });
}

type ExtendedWindow = Window & typeof globalThis & { ethereum: IronProvider };

/**
 * Sets the given provider instance as window.ethereum and dispatches the
 * 'ethereum#initialized' event on window.
 *
 * @param provider - The provider instance.
 */
function setGlobalProvider(provider: IronProvider): void {
  (window as ExtendedWindow).ethereum = provider;
  window.dispatchEvent(new Event("ethereum#initialized"));
}
