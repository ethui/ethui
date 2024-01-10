import { Table } from "@devtools-ds/table";
import { ObjectInspector } from "@devtools-ds/object-inspector";
import { Json, JsonRpcResponse, isJsonRpcSuccess } from "@metamask/utils";

import { Request, Response } from "@/types";

export function RpcResponse({
  response,
}: {
  response: JsonRpcResponse<Json> | Response;
}) {
  if (!response) return null;
  return (
    <>
      {isJsonRpcSuccess(response) && (
        <div>
          {JSON.stringify(response.result).replace(/[^a-zA-Z0-9 ]/g, "")}
        </div>
      )}
    </>
  );
}

const ExpandedRowWithoutParams = ({
  index,
  request,
  response,
}: {
  index: number;
  request: Request;
  response?: Response;
}) => (
  <Table.Cell colSpan={7}>
    <div
      style={{
        padding: "20px",
        border: "2px solid #bababa",
        backgroundColor: "#ffffff",
        borderRadius: "5px",
      }}
    >
      <h3 style={{ fontWeight: "bold" }}>#{index + 1} </h3>
      <div
        style={{
          display: "flex",
          justifyContent: "start",
          gap: "10%",
          position: "relative",
        }}
      >
        <div
          style={{
            padding: 8,
            border: "2px solid #bababa",
            borderRadius: "5px",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              textTransform: "uppercase",
              paddingBottom: 8,
            }}
          >
            {request.type} :
          </div>
          <div>
            {request.data && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  paddingLeft: "8px",
                }}
              >
                <div>
                  <strong>ID:</strong> {request.data.id}
                </div>
                <div>
                  <strong>JSON-RPC:</strong>
                  {request.data.jsonrpc}
                </div>
                <div>
                  <strong>Method:</strong> {request.data.method}
                </div>
              </div>
            )}
          </div>
          <div>
            <p style={{ fontWeight: "bold" }}>RAW REQUEST:</p>
            <ObjectInspector data={request} />
          </div>
        </div>
        <div
          style={{
            padding: 8,
            border: "2px solid #bababa",
            borderRadius: "5px",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              textTransform: "uppercase",
              paddingBottom: 8,
            }}
          >
            {response?.type}:
          </div>
          <div>
            {response?.data && (
              <div
                style={{
                  display: "flex",
                  paddingLeft: "8px",
                }}
              >
                <strong>Result:</strong>
                <RpcResponse response={response?.data} />
              </div>
            )}
          </div>
          <div>
            <p style={{ fontWeight: "bold" }}>RAW RESPONSE:</p>
            <ObjectInspector data={response} />
          </div>
        </div>
      </div>
    </div>
  </Table.Cell>
);

export default ExpandedRowWithoutParams;
