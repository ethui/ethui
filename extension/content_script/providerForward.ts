import { WindowPostMessageStream } from "@metamask/post-message-stream";
import browser from "webextension-polyfill";
import PortStream from "extension-port-stream";
import ObjectMultiplex from "@metamask/object-multiplex";
import pump, { type Stream } from "pump";
import * as Constants from "@iron/constants";

let METAMASK_EXTENSION_CONNECT_SENT = false;

export function initProviderForward() {
  const inpageStream = new WindowPostMessageStream({
    name: Constants.provider.contentscriptStreamName,
    target: Constants.provider.inpageStreamName,
  });

  const inpageMux = new ObjectMultiplex();
  inpageMux.setMaxListeners(25);
  pump(
    inpageMux as unknown as Stream,
    inpageStream as unknown as Stream,
    inpageMux as unknown as Stream,
    (err) => warnDisconnect("Iron Inpage Multiplex", err)
  );

  const pageChannel = inpageMux.createStream(Constants.provider.streamName);

  // bg stream
  METAMASK_EXTENSION_CONNECT_SENT = true;
  const bgPort = browser.runtime.connect({ name: "iron:contentscript" });
  const bgStream = new PortStream(bgPort);
  bgStream.on("data", extensionStreamMessageListener);

  // create and connect channel muxers
  // so we can handle the channels individually
  const bgMux = new ObjectMultiplex();
  bgMux.setMaxListeners(25);
  bgMux.ignoreStream("publicConfig"); // TODO:LegacyProvider: Delete

  pump(
    bgMux as unknown as Stream,
    bgStream,
    bgMux as unknown as Stream,
    (err: any) => {
      warnDisconnect("Iron Background Multiplex", err);
      // notifyInpageOfStreamFailure();
    }
  );

  const extensionChannel = bgMux.createStream(Constants.provider.streamName);
  pump(
    pageChannel as unknown as Stream,
    extensionChannel as unknown as Stream,
    pageChannel as unknown as Stream,
    (error: any) =>
      console.debug(
        `Iron: Muxed traffic for channel "iron:provider" failed.`,
        error
      )
  );
}

function warnDisconnect(remoteLabel: string, error: any) {
  console.debug(
    `[iron] Content script lost connection "${remoteLabel}".`,
    error
  );
}

// TODO: is this needed?
function extensionStreamMessageListener(msg: any) {
  if (
    METAMASK_EXTENSION_CONNECT_SENT &&
    msg.data.method === "metamask_chainChanged"
  ) {
    METAMASK_EXTENSION_CONNECT_SENT = false;
    window.postMessage(
      {
        target: "iron:inpage", // the post-message-stream "target"
        data: {
          // this object gets passed to obj-multiplex
          name: "iron:provider", // the obj-multiplex channel name
          data: {
            jsonrpc: "2.0",
            method: "METAMASK_EXTENSION_CONNECT_CAN_RETRY",
          },
        },
      },
      window.location.origin
    );
  }
}
