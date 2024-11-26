import type { Json, JsonRpcRequest, JsonRpcResponse } from "@metamask/utils";

export interface Request {
  timestamp: number;
  type: "request";
  tabId: number;
  data: JsonRpcRequest;
}

export interface Response {
  timestamp: number;
  type: "response";
  tabId: number;
  data: JsonRpcResponse<Json>;
}

export interface Start {
  type: "start";
  tabId: number;
  data?: Array<Request | Response>;
}

export type Msg = Request | Response;
