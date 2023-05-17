import { invoke } from "@tauri-apps/api/tauri";
import { useCallback } from "react";

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

  const accept = useCallback(() => {
    invoke("dialog_finish", { id, result: { Ok: payload } });
  }, [id, payload]);

  const reject = useCallback(() => {
    invoke("dialog_finish", { id, result: { Err: {} } });
  }, [id]);

  return (
    <Panel>
      <p>From: {payload.from}</p>
      <p>To: {payload.to}</p>
      <p>value: {payload.value}</p>
      <p>data: {payload.data}</p>

      <button onClick={accept}>Accept</button>
      <button onClick={reject}>Reject</button>
    </Panel>
  );
}
