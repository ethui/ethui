import { useEffect, useState } from "react";

import { useTheme } from "../store/theme";

interface Props {
  ticker: string;
}

const urlFor = (ticker: string, type: "color" | "black" | "white") =>
  `/cryptocurrency-icons/${type}/${ticker.toLowerCase()}.svg`;

export function IconCrypto({}: Props) {
  const themeMode = useTheme((s) => s.theme.palette.mode);

  const mode = themeMode === "dark" ? "black" : "white";

  const [error, setError] = useState(false);
  // const [src, setSrc] = useState<string | undefined>(urlFor(ticker, "color"));
  const [src, setSrc] = useState<string | undefined>(urlFor("generic", mode));
  const onError = () => setError(true);

  useEffect(() => {
    if (error) {
      setSrc(urlFor("generic", mode));
    }
  }, [error, mode]);

  return <img width="100%" {...{ src, onError }} />;
}
