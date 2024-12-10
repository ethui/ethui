"use client";

import Items from "@/components/items";
import { useState, useEffect } from "react";

export default function Home() {
  const [isSSR, setIsSSR] = useState(true);

  useEffect(() => {
    setIsSSR(false);
  }, []);

  if (isSSR) return null;

  return <Items />;
}
