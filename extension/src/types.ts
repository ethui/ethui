import { Json, JsonRpcRequest, JsonRpcResponse } from "@metamask/utils";

export interface DevtoolsRequest {
  timestamp: number;
  type: "request";
  data: JsonRpcRequest;
}

export interface DevtoolsResponse {
  timestamp: number;
  type: "response";
  data: JsonRpcResponse<Json>;
}

export type DevtoolsMsg = DevtoolsRequest | DevtoolsResponse;
