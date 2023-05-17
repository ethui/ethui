import { useDialog } from "../hooks/useDialog";
import Panel from "./Panel";

export interface TxRequest {
  data: string;
  from: string;
  to: string;
  value: string;
}

export function TxReviewDialog({ id }: { id: number }) {
  const { payload, accept, reject } = useDialog<TxRequest>(id);

  if (!payload) return null;

  return (
    <Panel>
      <p>From: {payload.from}</p>
      <p>To: {payload.to}</p>
      <p>value: {payload.value}</p>
      <p>data: {payload.data}</p>
      <button onClick={() => accept(payload)}>Accept</button>
      <button onClick={() => reject(payload)}>Reject</button>
    </Panel>
  );
}
