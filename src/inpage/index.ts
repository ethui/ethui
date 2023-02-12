import { WindowPostMessageStream } from "@metamask/post-message-stream";
import { CONTENT_SCRIPT_ID, INPAGE_ID } from "../constants";

export class InPage {
  private windowStream: WindowPostMessageStream;

  constructor() {
    console.log("[inpage] init");
    this.windowStream = this.initializeWindowStream();
  }

  private initializeWindowStream() {
    const stream = new WindowPostMessageStream({
      name: INPAGE_ID,
      target: CONTENT_SCRIPT_ID,
    });

    stream.on("data", (data: any) =>
      console.log("[inpage->windowStream] received: ", data)
    );
    stream.write("hello from inpage");

    return stream;
  }
}
