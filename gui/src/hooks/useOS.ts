import * as os from "@tauri-apps/api/os";
import { useEffect, useState } from "react";

export function useOS() {
  const [type, setType] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      setType(await os.type());
    })();
  }, []);

  return { type };
}
