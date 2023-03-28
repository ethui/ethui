import PortStream from "extension-port-stream";
import pump, { type Stream } from "pump";
import { type Duplex } from "stream";
import { runtime } from "webextension-polyfill";

import ObjectMultiplex from "@metamask/object-multiplex";
import { WindowPostMessageStream } from "@metamask/post-message-stream";

export function initProviderForward() {
  const inpageStream = new WindowPostMessageStream({
    name: "iron:provider:contentscript",
    target: "iron:provider:inpage",
  }) as unknown as Duplex;

  const inpageMux = new ObjectMultiplex();
  (inpageMux as unknown as Duplex).setMaxListeners(25);
  pump(
    inpageMux as unknown as Stream,
    inpageStream,
    inpageMux as unknown as Stream,
    (err) => warnDisconnect("Iron Inpage Multiplex", err)
  );

  const pageChannel = inpageMux.createStream(
    "metamask-provider"
  ) as unknown as Duplex;

  // bg stream
  const bgPort = runtime.connect({ name: "iron:contentscript" });
  const bgStream = new PortStream(bgPort);

  // create and connect channel muxers
  // so we can handle the channels individually
  const bgMux = new ObjectMultiplex();
  (bgMux as unknown as Duplex).setMaxListeners(25);
  bgMux.ignoreStream("publicConfig"); // TODO:LegacyProvider: Delete

  pump(
    bgMux as unknown as Stream,
    bgStream,
    bgMux as unknown as Stream,
    (err?: Error) => {
      warnDisconnect("Iron Background Multiplex", err);
    }
  );

  const extensionChannel = bgMux.createStream("metamask-provider");
  pump(
    pageChannel,
    extensionChannel as unknown as Stream,
    pageChannel,
    (error?: Error) =>
      console.debug(
        `Iron: Muxed traffic for channel "iron:provider" failed.`,
        error
      )
  );
}

function warnDisconnect(remoteLabel: string, error?: Error) {
  console.debug(
    `[iron] Content script lost connection "${remoteLabel}".`,
    error
  );
}
