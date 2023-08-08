import { fn } from "@wdio/browser-runner";

export default {
  runtime: {
    sendMessage: fn().mockResolvedValue({ data: "Some funny cat fact!" }),
  },
};
