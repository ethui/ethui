import { JsonRpcMiddleware } from "json-rpc-engine";

export const debugMiddleware: JsonRpcMiddleware<unknown, unknown> =
  async function (req, res, next, _end) {
    console.log("\n\n\n[req]", req);
    next();
  };
