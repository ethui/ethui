import Panel from "./Panel";

export interface TxRequest {
  data: string;
  from: string;
  to: string;
  value: string;
}
type Props = {
  id: number;
  payload: TxRequest;
};

export function TxReviewDialog({ id, payload }: Props) {
  console.log(payload);
  return (
    <Panel>
      <p>From: {payload.from}</p>
      <p>To: {payload.to}</p>
      <p>value: {payload.value}</p>
      <p>data: {payload.data}</p>
    </Panel>
  );
}
