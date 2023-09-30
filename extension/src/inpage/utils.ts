import { ethErrors } from "eth-rpc-errors";
import { JsonRpcMiddleware, PendingJsonRpcResponse } from "json-rpc-engine";
import log from "loglevel";

export type Maybe<T> = T | null | undefined;

/**
 * json-rpc-engine middleware that logs RPC errors and and validates req.method.
 *
 * @param log - The logging API to use.
 * @returns A json-rpc-engine middleware function.
 */
export function createErrorMiddleware(): JsonRpcMiddleware<unknown, unknown> {
  return (req, res, next) => {
    // json-rpc-engine will terminate the request when it notices this error
    if (typeof req.method !== "string" || !req.method) {
      res.error = ethErrors.rpc.invalidRequest({
        message: `The request 'method' must be a non-empty string.`,
        data: req,
      });
    }

    next((done) => {
      const { error } = res;
      if (!error) {
        done();
        return;
      }
      log.error(`Iron - RPC Error: ${error.message}`, error, req);
      done();
      return;
    });
  };
}

// resolve response.result or response, reject errors
export function getRpcPromiseCallback(
  resolve: (value?: unknown) => void,
  reject: (error?: Error) => void,
) {
  return (error: Error, response: PendingJsonRpcResponse<unknown>): void => {
    if (error || response.error) {
      reject(error || response.error);
    } else {
      const result = Array.isArray(response) ? response : response.result;

      resolve(result);
    }
  };
}
