import { useEffect, useState } from "react";

import { useTheme } from "../hooks/useTheme";

interface Props {
  ticker: string;
}

const urlFor = (ticker: string, type: "color" | "black" | "white") =>
  `/cryptocurrency-icons/${type}/${ticker.toLowerCase()}.svg`;

export function CryptoIcon({ ticker }: Props) {
  const theme = useTheme();

  const mode = theme?.palette.mode === "dark" ? "black" : "white";

  const [error, setError] = useState(false);
  const [src, setSrc] = useState<string | undefined>(urlFor(ticker, "color"));
  const onError = () => setError(true);

  useEffect(() => {
    if (error) {
      setSrc(urlFor("generic", mode));
    }
  }, [error, mode]);

  return <img width="100%" {...{ src, onError }} />;
}
