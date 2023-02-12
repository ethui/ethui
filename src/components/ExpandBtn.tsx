import browser from "webextension-polyfill";

interface Props {
  children: React.ReactNode;
}

function expand() {
  const url = browser.runtime.getURL("src/extension/expanded.html");
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
