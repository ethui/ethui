import { os } from "@tauri-apps/api";
import { useEffect, useState } from "react";

export function useOS() {
  const [type, setType] = useState<os.OsType | undefined>();

  useEffect(() => {
    (async () => {
      setType(await os.type());
    })();
  }, []);

  return { type };
}
