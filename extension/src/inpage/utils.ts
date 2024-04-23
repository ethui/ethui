import { JsonRpcMiddleware } from "@metamask/json-rpc-engine";
import { Json, JsonRpcParams } from "@metamask/utils";
import { ethErrors } from "eth-rpc-errors";
import log from "loglevel";

export type Maybe<T> = T | null | undefined;

export const name = import.meta.env.PROD ? "ethui" : "ethui-dev";

/**
 * json-rpc-engine middleware that logs RPC errors and validates req.method.
 *
 * @param log - The logging API to use.
 * @returns A json-rpc-engine middleware function.
 */
export const errorMiddleware: JsonRpcMiddleware<JsonRpcParams, Json> = (
  req,
  res,
  next,
) => {
  // json-rpc-engine will terminate the request when it notices this error
  if (typeof req.method !== "string" || !req.method) {
    res.error = ethErrors.rpc.invalidRequest({
      message: `The request 'method' must be a non-empty string.`,
      data: req,
    });
  }

  next((done) => {
    if (res.error) {
      log.error(`${name} - RPC Error: ${res.error.message}`, res.error, req);
    }
    done();
  });
};
