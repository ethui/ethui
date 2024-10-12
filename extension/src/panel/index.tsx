import { ObjectInspector } from "@devtools-ds/object-inspector";
import { Table } from "@devtools-ds/table";
import {
  type Json,
  type JsonRpcResponse,
  isJsonRpcError,
  isJsonRpcSuccess,
} from "@metamask/utils";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";

import { useStore } from "./store";

function Time({ request, response }: { request: number; response?: number }) {
  if (!response) return null;

  return <span>{response - request}ms</span>;
}

function Response({ response }: { response?: JsonRpcResponse<Json> }) {
  if (!response) return null;

  if (isJsonRpcError(response)) {
    return <ObjectInspector data={response} />;
  } else if (isJsonRpcSuccess(response)) {
    return <ObjectInspector data={response.result} />;
  } else {
    return null;
  }
}

function App() {
  const requests = useStore((s) => s.requests);
  const [selected, setSelected] = useState<string | undefined>();

  return (
    <Table
      selected={selected}
      onSelected={(id) => {
        setSelected(id);
      }}
    >
      <Table.Head>
        <Table.Row>
          <Table.HeadCell style={{ width: "10%" }}>Method</Table.HeadCell>
          <Table.HeadCell style={{ width: "5%" }}>Time</Table.HeadCell>
          <Table.HeadCell>Params</Table.HeadCell>
          <Table.HeadCell>Response</Table.HeadCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {requests.map(({ request, response }, id) => (
          <Table.Row key={id}>
            <Table.Cell>{request.data.method}</Table.Cell>
            <Table.Cell>
              <Time
                request={request.timestamp}
                response={response?.timestamp}
              />
            </Table.Cell>
            <Table.Cell>
              {request.data.params && (
                <ObjectInspector data={request.data.params} />
              )}
            </Table.Cell>
            <Table.Cell>
              <Response response={response?.data} />
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
