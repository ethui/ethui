import { JsonRpcMiddleware } from "json-rpc-engine";

export const debugMiddleware: JsonRpcMiddleware<unknown, unknown> =
  async function (req, _res, next) {
    console.log("\n\n\n[req]", req);
    next();
  };
