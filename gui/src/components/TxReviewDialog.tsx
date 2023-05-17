import { useDialog } from "../hooks/useDialog";
import Panel from "./Panel";

export interface TxRequest {
  data: string;
  from: string;
  to: string;
  value: string;
}

export function TxReviewDialog({ id }: { id: number }) {
  const { data, accept, reject } = useDialog<TxRequest>(id);

  if (!data) return null;

  const { from, to, value, data: calldata } = data;

  return (
    <Panel>
      <p>From: {from}</p>
      <p>To: {to}</p>
      <p>value: {value}</p>
      <p>data: {calldata}</p>
      <button onClick={() => accept(data)}>Accept</button>
      <button onClick={() => reject(data)}>Reject</button>
    </Panel>
  );
}
