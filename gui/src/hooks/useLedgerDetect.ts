import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

const ledgerSkippableError =
  "ledger error: hidapi error: hid_error is not implemented yet";

interface Props {
  disabled?: boolean;
  stopOnDetected?: boolean;
}

export const useLedgerDetect = ({ disabled, stopOnDetected }: Props = {}) => {
  const [count, setCount] = useState(0);
  const [detected, setDetected] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (disabled) return;
    if (detected && stopOnDetected) return;

    const interval = setInterval(
      () =>
        invoke("wallets_ledger_derive", { paths: ["m/44'/60'/0'/0/0"] })
          .then(() => setCount(Math.max(1, count + 1)))
          .catch((err) => {
            if (count > 0 && err === ledgerSkippableError) {
              console.warn("skipping ledger error:", err);
              return;
            }
            console.warn(err);
            setCount(Math.min(-1, count - 1));
          }),
      1000,
    );

    return () => clearInterval(interval);
  }, [count, disabled, detected, stopOnDetected]);

  useEffect(() => {
    if (count > 0) {
      setDetected(true);
    } else if (count <= -3) {
      setDetected(false);
    }
  }, [count]);

  return detected;
};
