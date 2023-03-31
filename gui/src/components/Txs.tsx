import { useAccount } from "../hooks";
import { useInvoke } from "../hooks/tauri";

export function Txs() {
  const account = useAccount();
  const { data: txs } = useInvoke<string[]>("get_transactions", {
    address: account,
  });

  console.log(txs);
  if (!txs) return null;

  return (
    <>
      <h1>Transactions</h1>
      <ul>
        {txs.map((tx: string) => (
          <li key={tx}>{tx}</li>
        ))}
      </ul>
    </>
  );
}
