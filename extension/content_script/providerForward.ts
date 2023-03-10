import PortStream from "extension-port-stream";
import pump from "pump";
import browser from "webextension-polyfill";

import ObjectMultiplex from "@metamask/object-multiplex";
import { WindowPostMessageStream } from "@metamask/post-message-stream";

import * as Constants from "@iron/constants";

export function initProviderForward() {
  const inpageStream = new WindowPostMessageStream({
    name: Constants.provider.contentscriptStreamName,
    target: Constants.provider.inpageStreamName,
  });

  const inpageMux = new ObjectMultiplex();
  inpageMux.setMaxListeners(25);
  pump(inpageMux, inpageStream, inpageMux, (err) =>
    warnDisconnect("Iron Inpage Multiplex", err)
  );

  const pageChannel = inpageMux.createStream(Constants.provider.streamName);

  // bg stream
  const bgPort = browser.runtime.connect({ name: "iron:contentscript" });
  const bgStream = new PortStream(bgPort);

  // create and connect channel muxers
  // so we can handle the channels individually
  const bgMux = new ObjectMultiplex();
  bgMux.setMaxListeners(25);
  bgMux.ignoreStream("publicConfig"); // TODO:LegacyProvider: Delete

  pump(bgMux, bgStream, bgMux, (err?: Error) => {
    warnDisconnect("Iron Background Multiplex", err);
  });

  const extensionChannel = bgMux.createStream(Constants.provider.streamName);
  pump(pageChannel, extensionChannel, pageChannel, (error?: Error) =>
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
