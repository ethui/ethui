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
          .then(() => setCount((prev) => Math.max(1, prev + 1)))
          .catch((err) =>
            setCount((prev) => {
              if (prev > 0 && err === ledgerSkippableError) {
                console.warn("skipping ledger error:", err);
                return prev;
              }
              console.warn(err);
              return Math.min(-1, prev - 1);
            }),
          ),
      1000,
    );

    return () => clearInterval(interval);
  }, [disabled, detected, stopOnDetected]);

  useEffect(() => {
    if (count > 0) {
      setDetected(true);
    } else if (count <= -3) {
      setDetected(false);
    }
  }, [count]);

  return detected;
};
