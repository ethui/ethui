import { WindowPostMessageStream } from "@metamask/post-message-stream";
import { CONTENT_SCRIPT_ID, INPAGE_ID } from "../constants";
import { IronProvider, attachGlobalProvider } from "../provider";

export class InPage {
  private windowStream: WindowPostMessageStream;
  private provider: IronProvider;

  constructor() {
    console.log("[inpage] init");
    this.windowStream = this.initializeWindowStream();
    // this.provider = new IronProvider
    this.provider = new IronProvider({ connectionStream: this.windowStream });
    attachGlobalProvider(this.provider);
  }

  private initializeWindowStream() {
    const stream = new WindowPostMessageStream({
      name: INPAGE_ID,
      target: CONTENT_SCRIPT_ID,
    });

    console.log("sending");
    stream.on("data", (data: any) =>
      console.log("[inpage->windowStream] received: ", data)
    );
    stream.write("hello from inpage");

    return stream;
  }
}
