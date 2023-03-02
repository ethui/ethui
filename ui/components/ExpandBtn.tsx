import React from "react";
import browser from "webextension-polyfill";

interface Props {
  children: React.ReactNode;
}

export function expand() {
  const url = browser.runtime.getURL("expanded.html");
  browser.tabs.create({ url }).then(() => window.close());
}

export function ExpandBtn({ children }: Props) {
  return (
    <button
      className="btn"
      onClick={() => {
        expand();
      }}
    >
      {children}
    </button>
  );
}
