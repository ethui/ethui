import { ObjectInspector } from "@devtools-ds/object-inspector";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Table } from "@devtools-ds/table";
import {
  isJsonRpcError,
  isJsonRpcSuccess,
  Json,
  JsonRpcError,
  JsonRpcResponse,
} from "@metamask/utils";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import ReportIcon from "@mui/icons-material/Report";

import { ChevronDownIcon, ChevronUpIcon } from "@devtools-ds/icon";
import { useStore } from "./store";

function Time({ request, response }: { request: number; response?: number }) {
  if (!response) return null;

  return <span>{response - request} ms</span>;
}

function Error({ error }: { error?: JsonRpcError }) {
  return (
    <>
      {isJsonRpcError(error) ? (
        <div
          style={{
            color: "#ff4545",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ReportIcon />
          <div>
            {error.code}: {error.message}
          </div>
        </div>
      ) : (
        <CheckCircleIcon color="success" />
      )}
    </>
  );
}

function Response({ response }: { response?: JsonRpcResponse<Json> }) {
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

function App() {
  const requests = useStore((s) => s.requests);

  const [selected, setSelected] = useState<string | undefined>();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleClick = (id: string) => {
    if (id === expandedRow) {
      setExpandedRow(null);
    } else {
      setExpandedRow(id);
    }
    setSelected(id);
  };

  return (
    <Table
      selected={selected}
      onSelected={(id) => {
        setSelected(id);
      }}
      style={{
        border: "none",
        borderCollapse: "collapse",
      }}
    >
      <Table.Head
        style={{
          boxShadow: "none",
          backgroundColor: "#3d3d3d",
          color: "#ffffff",
        }}
      >
        <Table.Row
          style={{
            fontSize: "1em",
          }}
        >
          <Table.HeadCell style={{ width: "2%", textAlign: "center" }}>
            #
          </Table.HeadCell>
          <Table.HeadCell style={{ width: "20%" }}>Method</Table.HeadCell>
          <Table.HeadCell style={{ width: "10%" }}>
            Response Time
          </Table.HeadCell>
          <Table.HeadCell style={{ width: "15%" }}>Status</Table.HeadCell>
          {/* "Response" Can be the account address or the txn hash */}
          <Table.HeadCell>Response</Table.HeadCell>
          <Table.HeadCell style={{ width: "15%" }}>Network</Table.HeadCell>
          <Table.HeadCell style={{ width: "15%" }} />
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {requests.map(({ request, response }, index) => (
          <React.Fragment key={index}>
            <Table.Row
              onClick={() => handleClick(index.toString())}
              style={{
                backgroundColor: "#ffffff",
              }}
            >
              <Table.Cell style={{ textAlign: "center" }}>
                {index + 1}
              </Table.Cell>
              <Table.Cell>{request.data.method}</Table.Cell>
              <Table.Cell>
                <Time
                  request={request.timestamp}
                  response={response?.timestamp}
                />
              </Table.Cell>
              <Table.Cell>
                <Error error={response?.data.error} />
              </Table.Cell>
              <Table.Cell>
                <Response response={response?.data} />
              </Table.Cell>

              <Table.Cell>network</Table.Cell>

              <Table.Cell style={{ cursor: "pointer", fontWeight: "bold" }}>
                {expandedRow !== index.toString() ? (
                  <span>
                    <ChevronDownIcon fill="rgba(0,0,0,.8)" inline />
                    Show details
                  </span>
                ) : (
                  <span>
                    <ChevronUpIcon fill="rgba(0,0,0,.8)" inline />
                    Close details
                  </span>
                )}
              </Table.Cell>
            </Table.Row>

            {/* expanded row */}
            {expandedRow === index.toString() && (
              <Table.Row style={{ backgroundColor: "#ffffff" }}>
                {request.data.params && Array.isArray(request.data.params) ? (
                  // WITH PARAMS
                  <Table.Cell colSpan={7}>
                    <div
                      style={{
                        padding: "20px",
                        border: "2px solid #bababa",
                        backgroundColor: "#ffffff",
                        borderRadius: "5px",
                      }}
                    >
                      <div style={{ fontWeight: "bold" }}>
                        #{index + 1} Transaction Details:
                      </div>
                      <div>
                        <p style={{ fontWeight: "bold" }}>PARAMS:</p>
                        {request.data.params &&
                          Array.isArray(request.data.params) &&
                          request.data.params[0] && (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                                paddingLeft: "8px",
                              }}
                            >
                              <div>
                                <strong>Data: </strong>
                                {(request.data.params[0] as any)?.data}
                              </div>
                              <div>
                                <strong>From: </strong>
                                {(request.data.params[0] as any)?.from}
                              </div>
                              <div>
                                <strong>To: </strong>
                                {(request.data.params[0] as any)?.to}
                              </div>
                            </div>
                          )}
                      </div>
                      <div>
                        <p style={{ fontWeight: "bold" }}>RAW REQUEST:</p>
                        {request.data.params && (
                          <ObjectInspector data={request.data} />
                        )}
                      </div>
                    </div>
                  </Table.Cell>
                ) : (
                  // NO PARAMS
                  <Table.Cell colSpan={7}>
                    <div
                      style={{
                        padding: "20px",
                        border: "2px solid #bababa",
                        backgroundColor: "#ffffff",
                        borderRadius: "5px",
                      }}
                    >
                      <div>#{index + 1} </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "start",
                          gap: "10%",
                          position: "relative",
                        }}
                      >
                        {/* REQUEST without params */}
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

                        {/* RESPONSE without params */}
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
                                <Response response={response?.data} />
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
                )}
              </Table.Row>
            )}
          </React.Fragment>
        ))}
      </Table.Body>
    </Table>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
