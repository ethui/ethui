import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Table } from "@devtools-ds/table";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import ReportIcon from "@mui/icons-material/Report";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";
import { ChevronDownIcon, ChevronUpIcon } from "@devtools-ds/icon";
import { JsonRpcError, PendingJsonRpcResponse } from "@metamask/utils";

import { Response } from "@/types";
import ExpandedRowWithParams from "./components/ExpandedRowWithParams";
import ExpandedRowWithoutParams, {
  RpcResponse,
} from "./components/ExpandedRowWithoutParams";
import { useStore } from "./store";

type TableCellProps = {
  children: React.ReactNode;
  textAlign?: string;
};

type StatusCellProps = {
  error?: JsonRpcError;
  pending?: PendingJsonRpcResponse<unknown>;
};

const TableCell: React.FC<TableCellProps> = ({ children }) => (
  <Table.Cell>{children}</Table.Cell>
);

const StatusCell: React.FC<StatusCellProps> = ({ error, pending }) => (
  <TableCell textAlign="start">
    {error ? (
      <div style={{ color: "#ff4545", display: "flex", alignItems: "center" }}>
        <ReportIcon />
        <div>
          {error.code}: {error.message}
        </div>
      </div>
    ) : pending ? (
      <div style={{ color: "#202020", display: "flex", alignItems: "center" }}>
        <CircularProgress size={20} color="primary" />
      </div>
    ) : (
      <CheckCircleIcon color="success" />
    )}
  </TableCell>
);

const TimeCell: React.FC<{ request: number; response?: number }> = ({
  request,
  response,
}) => <TableCell>{response && <span>{response - request} ms</span>}</TableCell>;

const ResponseCell: React.FC<{ response?: Response }> = ({ response }) => (
  <TableCell textAlign="start">
    {response && <RpcResponse response={response} />}
  </TableCell>
);

const DetailsCell: React.FC<{ expanded: boolean; onClick: () => void }> = ({
  expanded,
  onClick,
}) => (
  <TableCell>
    <Button variant="text" onClick={onClick}>
      {expanded ? (
        <>
          <ChevronUpIcon fill="rgba(0,0,0,.8)" inline />
          Close details
        </>
      ) : (
        <>
          <ChevronDownIcon fill="rgba(0,0,0,.8)" inline />
          Show details
        </>
      )}
    </Button>
  </TableCell>
);

const tableheads = [
  { title: "", width: "2%" },
  { title: "Method", width: "20%" },
  { title: "Response Time", width: "10%" },
  { title: "Status", width: "15%" },
  { title: "Response", width: "40%" },
  { title: "Details", width: "15%" },
];

function App() {
  const requests = useStore((s) => s.requests);

  const [selected, setSelected] = useState<string | undefined>();
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const handleClick = (id: string) => {
    const isRowExpanded = expandedRows.includes(id);
    const newExpandedRows = isRowExpanded
      ? expandedRows.filter((rowId) => rowId !== id)
      : [...expandedRows, id];

    setExpandedRows(newExpandedRows);
    setSelected(id);
  };

  return (
    <Table
      selected={selected}
      onSelected={(id) => setSelected(id)}
      style={{ border: "none", borderCollapse: "collapse" }}
    >
      <Table.Head
        style={{
          boxShadow: "none",
          backgroundColor: "#3d3d3d",
          color: "#ffffff",
        }}
      >
        <Table.Row style={{ fontSize: "1em" }}>
          {tableheads.map((head, index) => (
            <Table.HeadCell key={index} style={{ width: head.width }}>
              {head.title}
            </Table.HeadCell>
          ))}
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {requests.map(({ request, response }, index) => (
          <React.Fragment key={index}>
            <Table.Row>
              <TableCell textAlign="center">{index + 1}</TableCell>
              <TableCell>{request.data.method}</TableCell>
              <TimeCell
                request={request.timestamp}
                response={response?.timestamp}
              />
              <StatusCell error={response?.data.error} pending={!response} />
              <ResponseCell response={response?.data} />
              <DetailsCell
                onClick={() => handleClick(index.toString())}
                expanded={expandedRows.includes(index.toString())}
              />
            </Table.Row>

            {expandedRows.includes(index.toString()) && (
              <Table.Row style={{ backgroundColor: "#ffffff" }}>
                {request.data.params && Array.isArray(request.data.params) ? (
                  <ExpandedRowWithParams index={index} request={request} />
                ) : (
                  <ExpandedRowWithoutParams
                    index={index}
                    request={request}
                    response={response}
                  />
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
  </React.StrictMode>,
);
