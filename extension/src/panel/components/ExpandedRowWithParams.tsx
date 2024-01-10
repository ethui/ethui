import { Table } from "@devtools-ds/table";
import { ObjectInspector } from "@devtools-ds/object-inspector";

import { Request, Params } from "@/types";

const ExpandedRowWithParams = ({
  index,
  request,
}: {
  index: number;
  request: Request;
}) => {
  //check if params exists, is an array and has elements to show:
  const params: Params =
    request.data.params &&
    Array.isArray(request.data.params) &&
    request.data.params[0];

  return (
    <Table.Cell colSpan={7}>
      <div
        style={{
          padding: "20px",
          border: "2px solid #bababa",
          backgroundColor: "#ffffff",
          borderRadius: "5px",
        }}
      >
        <h3 style={{ fontWeight: "bold" }}>
          #{index + 1} Transaction Details:
        </h3>
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
                  {params?.data}
                </div>
                <div>
                  <strong>From: </strong>
                  {params.from}
                </div>
                <div>
                  <strong>To: </strong>
                  {params.to}
                </div>
              </div>
            )}
        </div>
        <div>
          <p style={{ fontWeight: "bold" }}>RAW REQUEST:</p>
          {request.data.params && <ObjectInspector data={request.data} />}
        </div>
      </div>
    </Table.Cell>
  );
};

export default ExpandedRowWithParams;
