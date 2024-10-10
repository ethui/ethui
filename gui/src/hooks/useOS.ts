import { type OsType, type } from "@tauri-apps/plugin-os";
import { useEffect, useState } from "react";

export function useOS() {
  const [t, setT] = useState<OsType | undefined>();

  useEffect(() => {
    (async () => {
      setT(await type());
    })();
  }, []);

  return { type: t };
}
