// import { IronProvider, attachGlobalProvider } from "../provider";

import { WindowPostMessageStream } from "@metamask/post-message-stream";

// let provider: IronProvider;

export function init() {
  console.log("[inpage] init");
  // this.provider = new IronProvider
  // this.provider = new IronProvider();
  // attachGlobalProvider(this.provider);
  setupStream();
}

function setupStream() {
  //
  // inpage <-> cs
  const csStream = new WindowPostMessageStream({
    name: "inpage",
    target: "contentscript",
  });
  csStream.on("data", (data) => console.log("from cs", data));
  console.log("inpage write");
  csStream.write({ name: "provider", foo: "3hello from inpage", data: "foo" });
}
